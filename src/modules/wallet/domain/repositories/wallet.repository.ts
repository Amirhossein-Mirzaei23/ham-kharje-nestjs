// domain/repositories/wallet.repository.ts
import { Wallet } from '../entities/wallet.entity';

export abstract class WalletRepository {
  /**
   * پیدا کردن کیف پول کاربر
   */
  abstract findByUserId(userId: number): Promise<Wallet | null>;

  /**
   * ایجاد کیف پول (مثلاً بعد از ثبت‌نام)
   */
  abstract createForUser(userId: number): Promise<Wallet>;

  /**
   * افزایش موجودی کیف پول
   * ⚠️ فقط داخل Transaction استفاده شود
   */
  abstract increaseBalance(
    walletId: number,
    amount: number,
  ): Promise<void>;

  /**
   * کاهش موجودی (برای خرید / برداشت)
   * ⚠️ باید اعتبارسنجی شود
   */
  abstract decreaseBalance(
    walletId: number,
    amount: number,
  ): Promise<void>;

  /**
   * دریافت کیف پول با Lock
   * برای عملیات مالی حساس
   */
  abstract findByIdForUpdate(
    walletId: number,
  ): Promise<Wallet>;
}
