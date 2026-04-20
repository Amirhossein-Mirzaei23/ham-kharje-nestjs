# Wallet, Payment, Transaction, and Vandar API Guide

This document explains the wallet, transaction, bill-payment, and Vandar payment APIs implemented in this backend.

It is based on the current source code in:

- `src/modules/wallet`
- `src/modules/bills-management`

## 1. Overview

The current payment-related implementation covers 4 main areas:

1. Wallet charge via Vandar IPG
2. Wallet-to-wallet transfer
3. Wallet withdrawal to bank account via Vandar settlement
4. Bill payment tracking and transaction history

There are also two different payment flows in the codebase:

- Active flow: `WalletController` + `WalletService` + `VandarService`
- Inactive/unfinished flow: `PaymentController` + `ChargeWalletUseCase` + `VerifyPaymentUseCase`

Important:

- `PaymentController` is present in the codebase but is not registered in `src/modules/wallet/wallet.module.ts`, so its routes are not currently exposed.
- A global JWT guard is enabled in `src/app.module.ts`, so every route requires a Bearer token unless marked with `@Public()`.
- The current wallet callback route `GET /wallet/callback` is not marked `@Public()`, so Vandar callback requests may fail unless this is changed.

## 2. Authentication

The project uses JWT Bearer authentication.

Send this header for protected endpoints:

```http
Authorization: Bearer <jwt_token>
```

Because a global `APP_GUARD` is configured, assume all routes below require authentication unless you intentionally make them public.

## 3. Environment Variables

These variables are relevant for the active Vandar integration:

- `VANDAR_IPG_API_KEY`: required for payment token creation and payment verification
- `VANDAR_BUSINESS`: required for settlement API
- `VANDAR_ACCESS_TOKEN`: required for settlement API
- `VANDAR_API_BASE_URL`: optional, default `https://api.vandar.io`
- `VANDAR_IPG_BASE_URL`: optional, default `https://ipg.vandar.io`

General app variables also matter:

- `JWT_SECRET`
- `PORT`
- database config variables

## 4. Data Model Summary

### Wallet

Stored in `wallets` table:

- `id`
- `userId`
- `balance`
- `version`

Each user is expected to have one wallet record.

### WalletTransaction

Stored in `wallet_transactions` table:

- `id` (UUID)
- `walletId`
- `paidByUserId`
- `paidToUserId`
- `billId`
- `amount`
- `gateway`
- `referenceId`
- `type`
- `status`
- `meta`
- `createdAt`

### Transaction statuses

- `PENDING`
- `WITHDRAW_PENDING`
- `SUCCESS`
- `FAILED`

### Transaction types

- `CHARGE_WALLET`
- `DEBIT`
- `CREDIT`
- `WITHDRAWAL`
- `BUY_INTERNET`
- `BUY_MOBILE_CHARGE`
- `PAY_BILLS`

## 5. Active Wallet APIs

Base controller: `@Controller('wallet')`

### 5.1 Charge wallet

Endpoint:

```http
POST /wallet/charge
```

Auth: required

Purpose:

- Creates a Vandar payment token
- Creates a pending wallet transaction
- Returns the Vandar payment URL so the client can redirect the user

Request body:

```json
{
  "amount": 50000,
  "callbackUrl": "https://your-frontend.example.com/payment-result",
  "mobileNumber": "09123456789",
  "factorNumber": "INV-1001",
  "description": "Wallet top-up",
  "validCardNumbers": ["6037991234567890"],
  "comment": "optional note"
}
```

Validation rules:

- `amount`: integer, minimum `1000`
- `callbackUrl`: valid URL
- `mobileNumber`: optional Iranian mobile number
- `factorNumber`: optional, max 100 chars
- `description`: optional, max 255 chars
- `validCardNumbers`: optional string array, max 10 items
- `comment`: optional, max 255 chars

Response shape:

```json
{
  "transactionId": "uuid",
  "status": "PENDING",
  "paymentToken": "vandar_token",
  "paymentUrl": "https://ipg.vandar.io/v4/vandar_token"
}
```

Internal behavior:

- Finds the wallet by authenticated user ID
- Calls Vandar `/api/v4/send`
- Saves a `CHARGE_WALLET` transaction with:
  - `gateway = "VANDAR"`
  - `status = "PENDING"`
  - `referenceId = payment token`

Client flow:

1. Call `POST /wallet/charge`
2. Receive `paymentUrl`
3. Redirect the user to `paymentUrl`
4. Wait for Vandar callback handling
5. Refresh wallet balance/history

### 5.2 Vandar callback for wallet charge

Endpoint:

```http
GET /wallet/callback?token=<token>&payment_status=OK
```

Auth: currently required because of global JWT guard

Important implementation note:

- For real gateway callbacks, this route should normally be public.
- In the current code, it is not decorated with `@Public()`.

Query params:

- `token`: required Vandar payment token
- `payment_status`: optional, `OK` or `FAILED`

Success behavior:

- Finds the pending transaction by `referenceId = token`
- If already processed, returns `alreadyProcessed: true`
- If `payment_status !== OK`, marks transaction as `FAILED`
- If `payment_status === OK`, verifies the payment with Vandar
- On successful verification:
  - increments wallet balance
  - marks transaction as `SUCCESS`
  - stores callback and verification data in `meta`

Success response example:

```json
{
  "transactionId": "uuid",
  "status": "SUCCESS",
  "verified": true,
  "amount": 50000
}
```

Failure response example:

```json
{
  "transactionId": "uuid",
  "status": "FAILED",
  "verified": false
}
```

### 5.3 Transfer wallet to another wallet

Endpoint:

```http
POST /wallet/transfer
```

Auth: required

Purpose:

- Moves balance from the authenticated user wallet to another user wallet
- Creates 2 transactions for the same reference:
  - sender side: `DEBIT`
  - recipient side: `CREDIT`

Request body:

```json
{
  "recipientUserId": 23,
  "amount": 25000
}
```

Validation rules:

- `recipientUserId`: integer
- `amount`: integer, minimum `1`

Business rules:

- sender cannot transfer to self
- both users must exist
- both wallets must exist
- sender must have enough balance
- wallet rows are locked inside DB transaction

Response example:

```json
{
  "referenceId": "uuid",
  "amount": 25000,
  "senderBalance": 175000,
  "recipientBalance": 90000,
  "debitTransactionId": "uuid",
  "creditTransactionId": "uuid"
}
```

### 5.4 Withdraw wallet to bank account

Endpoint:

```http
POST /wallet/withdraw
```

Auth: required

Purpose:

- Decreases wallet balance
- Creates a `WITHDRAWAL` transaction with `WITHDRAW_PENDING`
- Sends settlement request to Vandar business settlement API

Request body:

```json
{
  "amount": 100000,
  "iban": "IR062960000000100324200001",
  "reason": "cash out"
}
```

Validation rules:

- `amount`: integer, minimum `1`
- `iban`: optional valid IBAN
- `reason`: optional string, max 255 chars

Business rules:

- user must exist
- wallet must exist
- if `iban` is not sent, fallback is `user.shebaNumber`
- if no IBAN exists in either place, request fails
- wallet balance is reduced before settlement request
- transaction is stored with:
  - `gateway = "VANDAR_SETTLEMENT"`
  - `type = "WITHDRAWAL"`
  - `status = "WITHDRAW_PENDING"`

Response example:

```json
{
  "transactionId": "uuid",
  "referenceId": "uuid",
  "status": "WITHDRAW_PENDING",
  "amount": 100000,
  "iban": "IR062960000000100324200001",
  "balance": 450000
}
```

Important note:

- The current code does not update the withdrawal transaction from `WITHDRAW_PENDING` to `SUCCESS`/`FAILED` after settlement completion. It only stores the settlement response in `meta`.

### 5.5 Get current user wallet

Endpoint:

```http
GET /wallet/me
```

Auth: required

Response example:

```json
{
  "id": 1,
  "userId": 12,
  "balance": 450000,
  "version": 3
}
```

### 5.6 Get current user wallet history

Endpoint:

```http
GET /wallet/me/history
```

Auth: required

Returns transactions where the user is either:

- `paidByUserId = userId`
- `paidToUserId = userId`

Transactions are ordered by `createdAt DESC`.

### 5.7 Get wallet by user ID

Endpoint:

```http
GET /wallet/:userId
```

Auth: currently required because of global JWT guard

Purpose:

- Fetches wallet data for any user ID

### 5.8 Get wallet history by user ID

Endpoint:

```http
GET /wallet/:userId/history
```

Auth: currently required because of global JWT guard

Purpose:

- Fetches wallet transaction history for any user ID

## 6. Transaction APIs

Base controller: `@Controller('wallet/transactions')`

These routes use `WalletTransactionService`.

Important:

- Because of the global JWT guard, these routes also require authentication.
- There is no explicit ownership check here; any authenticated client may be able to query another user's history if you do not add authorization rules.

### 6.1 Create wallet transaction manually

Endpoint:

```http
POST /wallet/transactions
```

Auth: required

Purpose:

- Creates a transaction directly in the database

Request body example:

```json
{
  "walletId": 3,
  "paidByUserId": 12,
  "paidToUserId": 18,
  "billId": 9,
  "amount": 20000,
  "gateway": "VANDAR",
  "referenceId": "ref-123",
  "meta": {
    "source": "manual"
  },
  "type": "PAY_BILLS"
}
```

Rules:

- validates user, wallet, and bill references if provided
- defaults `type`:
  - `PAY_BILLS` if `billId` exists
  - otherwise `CHARGE_WALLET`
- always stores transaction with `status = SUCCESS`

Response:

- returns the saved `WalletTransaction` entity

### 6.2 Get transaction history for a user

Endpoint:

```http
GET /wallet/transactions/user/:userId
```

Auth: required

Response:

- array of wallet transactions ordered by newest first

### 6.3 Get a transaction by ID

Endpoint:

```http
GET /wallet/transactions/:id
```

Auth: required

Response:

- one transaction with relations:
  - `wallet`
  - `paidByUser`
  - `paidToUser`
  - `bill`

## 7. Bill APIs Related to Payments

Base controller: `@Controller('bills')`

These APIs are not gateway APIs, but they are directly related to debt/payment flow.

### 7.1 Create a bill

Endpoint:

```http
POST /bills
```

Auth: required because of global guard

Request body example:

```json
{
  "creditorId": 12,
  "debtorId": 18,
  "title": "Dinner share",
  "amount": 80000,
  "paid": 0,
  "isPaid": false,
  "referenceId": "batch-001",
  "groupId": 4,
  "totalAmount": 240000
}
```

Rules:

- `creditorId` must exist
- `debtorId` is required in the active implementation
- if `groupId` is sent, the group is loaded and attached
- `title` is required

Response:

- saved bill entity

### 7.2 Pay a bill

Endpoint:

```http
PATCH /bills/:id/pay
```

Auth: required because of global guard

Request body:

```json
{
  "amount": 30000,
  "payerUserId": 18
}
```

Behavior:

- loads bill by ID
- increases `bill.paid`
- marks `bill.isPaid = true` if `paid >= amount`
- records a wallet transaction via `WalletTransactionService.recordBillPayment(...)`

Response example:

```json
{
  "bill": {
    "id": 10,
    "paid": 30000,
    "isPaid": false
  },
  "transaction": {
    "id": "uuid",
    "type": "PAY_BILLS",
    "status": "SUCCESS"
  }
}
```

Important implementation note:

- `payBill()` records a transaction entry, but it does not reduce wallet balance or move funds between wallets.
- Right now it is better understood as payment tracking/history, not a real wallet debit/credit settlement flow.

### 7.3 List bills for a user

Endpoint:

```http
GET /bills/user/:id
```

Auth: required because of global guard

Returns bills where user is:

- debtor
- creditor

### 7.4 Delete bill by reference ID

Endpoint:

```http
DELETE /bills/:id
```

Auth: required because of global guard

Important note:

- The route parameter is named `:id`, but the service actually deletes by `referenceId`.
- So in practice this endpoint expects the bill reference string, not the numeric bill ID.

Example:

```http
DELETE /bills/batch-001
```

Response:

```json
{
  "message": "Bill deleted successfully"
}
```

## 8. Vandar Integration Details

### Charge flow

The active Vandar charge flow is:

1. Client calls `POST /wallet/charge`
2. Backend calls `VandarService.createPaymentToken()`
3. Backend stores a pending `CHARGE_WALLET` transaction
4. Client redirects user to returned `paymentUrl`
5. Vandar returns to callback route with `token` and `payment_status`
6. Backend verifies the token using `VandarService.verifyPayment()`
7. Backend increments wallet balance and marks transaction `SUCCESS`

### Settlement flow

The active settlement flow is:

1. Client calls `POST /wallet/withdraw`
2. Backend locks wallet and user rows
3. Backend decreases wallet balance
4. Backend creates `WITHDRAWAL` transaction with `WITHDRAW_PENDING`
5. Backend calls `VandarService.createSettlement()`
6. Backend stores settlement response in transaction `meta`

### Vandar service methods

Implemented in `src/modules/wallet/infrastructure/vandar.service.ts`:

- `createPaymentToken(payload)`
- `verifyPayment(token)`
- `createSettlement(amount, iban, trackId, options?)`

## 9. Example Client Usage

### Charge wallet

```bash
curl -X POST http://localhost:3000/wallet/charge \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "callbackUrl": "https://app.example.com/payment-result",
    "mobileNumber": "09123456789",
    "description": "wallet top-up"
  }'
```

### Transfer between wallets

```bash
curl -X POST http://localhost:3000/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": 25,
    "amount": 10000
  }'
```

### Withdraw to bank

```bash
curl -X POST http://localhost:3000/wallet/withdraw \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "iban": "IR062960000000100324200001",
    "reason": "wallet payout"
  }'
```

### Pay bill

```bash
curl -X PATCH http://localhost:3000/bills/10/pay \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 30000,
    "payerUserId": 18
  }'
```

## 10. Known Gaps and Recommendations

These are important if you want to expose these APIs to frontend/mobile clients safely:

1. Make callback routes public
   - add `@Public()` on `GET /wallet/callback`
   - otherwise Vandar cannot call it without JWT

2. Add authorization checks on user-scoped routes
   - `GET /wallet/:userId`
   - `GET /wallet/:userId/history`
   - `GET /wallet/transactions/user/:userId`

3. Clarify bill payment behavior
   - current `payBill()` updates bill and creates transaction history
   - it does not actually debit payer wallet or credit creditor wallet

4. Clarify delete-bill route naming
   - route says `:id`
   - service deletes by `referenceId`

5. Decide whether `PaymentController` should be removed or registered
   - right now it exists but is not used by the module

6. Add withdrawal finalization flow
   - current withdraw result stays `WITHDRAW_PENDING`
   - no callback/webhook/final update logic is implemented

## 11. Suggested Frontend Integration Order

Recommended order for using these APIs:

1. Create or verify wallet exists for the user
2. Use `GET /wallet/me` to display balance
3. Use `POST /wallet/charge` for top-up
4. After payment callback handling, refresh `GET /wallet/me`
5. Show `GET /wallet/me/history`
6. Use `POST /wallet/transfer` for internal wallet transfers
7. Use `POST /wallet/withdraw` for cash-out
8. Use bill APIs separately for debt tracking

