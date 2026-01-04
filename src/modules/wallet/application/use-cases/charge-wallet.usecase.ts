import { Injectable, NotFoundException } from "@nestjs/common";
import { TransactionType } from "../../domain/enums/transaction-type.enum";
import { TransactionStatus } from "../../domain/enums/transaction-status.enum";
import { PaymentFactory } from "../../infrastructure/payment/payment.factory";
import { TransactionRepository } from "../../domain/repositories/transaction.repository";
import { WalletRepository } from "../../domain/repositories/wallet.repository";

@Injectable()
export class ChargeWalletUseCase {
  constructor(
    private walletRepo: WalletRepository,
    private txRepo: TransactionRepository,
    private paymentFactory: PaymentFactory,
  ) {}

  async execute(userId: number, amount: number, gateway: string) {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
        throw new NotFoundException('کیف پول یاقت نشد')
    }
    const tx = await this.txRepo.create({
      walletId: wallet.id,
      amount,
      gateway,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
    });

    const payment = this.paymentFactory.get(gateway);

    const result = await payment.request({
      amount,
      callbackUrl: `${process.env.BASE_URL}/wallet/payment/callback`,
      description: 'Wallet Charge',
      referenceId: tx.id,
    });

    await this.txRepo.setReference(tx.id, result.authority);

    return result.paymentUrl;
  }
}
