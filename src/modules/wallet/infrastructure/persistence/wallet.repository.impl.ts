import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Wallet } from "src/modules/wallet/domain/entities/wallet.entity";
import { WalletRepository } from "src/modules/wallet/domain/repositories/wallet.repository";
import { Repository } from "typeorm";

@Injectable()
export class WalletRepositoryImpl implements WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  // ----------------------------
  // Read
  // ----------------------------

  async findByUserId(userId: number): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { userId },
    });
  }
  async findAll(): Promise<any> {
      return this.repo.find();
  }

  async findByIdForUpdate(walletId: number): Promise<Wallet> {
    return this.repo
      .createQueryBuilder('wallet')
      .where('wallet.id = :id', { id: walletId })
      .setLock('pessimistic_write') // SELECT ... FOR UPDATE
      .getOneOrFail();
  }

  // ----------------------------
  // Create
  // ----------------------------

  async createForUser(userId: number): Promise<Wallet> {
    const wallet = this.repo.create({
      userId,
      balance: 0,
    });

    return this.repo.save(wallet);
  }

  // ----------------------------
  // Balance Operations
  // ----------------------------

  async increaseBalance(
    walletId: number,
    amount: number,
  ): Promise<void> {
    await this.repo.increment(
      { id: walletId },
      'balance',
      amount,
    );
  }

  async decreaseBalance(
    walletId: number,
    amount: number,
  ): Promise<void> {
    await this.repo.decrement(
      { id: walletId },
      'balance',
      amount,
    );
  }
}
