import { NotFoundException } from '@nestjs/common';

export class WalletNotFoundException extends NotFoundException {
  constructor(userId?: number) {
    super(
      userId
        ? `Wallet for user ${userId} was not found`
        : 'Wallet was not found',
    );
  }
}
