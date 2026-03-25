import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletTransactionHistory1750284000000
  implements MigrationInterface
{
  name = 'AddWalletTransactionHistory1750284000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "paidByUserId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "paidToUserId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN IF NOT EXISTS "billId" integer
    `);

    await queryRunner.query(`
      UPDATE "wallet_transactions" wt
      SET "paidByUserId" = w."userId"
      FROM "wallets" w
      WHERE wt."walletId" = w."id"
        AND wt."paidByUserId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "paidByUserId" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "walletId" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "gateway" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "referenceId" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'wallet_transactions_type_enum'
        ) THEN
          ALTER TYPE "wallet_transactions_type_enum"
          RENAME TO "wallet_transactions_type_enum_old";
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'wallet_transactions_type_enum'
        ) THEN
          CREATE TYPE "wallet_transactions_type_enum" AS ENUM (
            'CHARGE_WALLET',
            'PAY_BILLS',
            'CHARGE_INTERNET'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "type" TYPE "wallet_transactions_type_enum"
      USING (
        CASE
          WHEN "type"::text = 'DEPOSIT' THEN 'CHARGE_WALLET'
          ELSE "type"::text
        END
      )::"wallet_transactions_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "wallet_transactions_type_enum_old"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_wallet_transactions_wallet'
            AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_wallet"
          FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_wallet_transactions_paid_by_user'
            AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_paid_by_user"
          FOREIGN KEY ("paidByUserId") REFERENCES "user"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_wallet_transactions_paid_to_user'
            AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_paid_to_user"
          FOREIGN KEY ("paidToUserId") REFERENCES "user"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_wallet_transactions_bill'
            AND table_name = 'wallet_transactions'
        ) THEN
          ALTER TABLE "wallet_transactions"
          ADD CONSTRAINT "FK_wallet_transactions_bill"
          FOREIGN KEY ("billId") REFERENCES "bill"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_paidByUserId"
      ON "wallet_transactions" ("paidByUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_paidToUserId"
      ON "wallet_transactions" ("paidToUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_billId"
      ON "wallet_transactions" ("billId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_wallet_transactions_billId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_wallet_transactions_paidToUserId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_wallet_transactions_paidByUserId"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_bill"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_paid_to_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_paid_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_wallet"
    `);

    await queryRunner.query(`
      CREATE TYPE "wallet_transactions_type_enum_old" AS ENUM ('DEPOSIT')
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "type" TYPE "wallet_transactions_type_enum_old"
      USING (
        CASE
          WHEN "type"::text = 'CHARGE_WALLET' THEN 'DEPOSIT'
          WHEN "type"::text = 'PAY_BILLS' THEN 'DEPOSIT'
          WHEN "type"::text = 'CHARGE_INTERNET' THEN 'DEPOSIT'
          ELSE 'DEPOSIT'
        END
      )::"wallet_transactions_type_enum_old"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "wallet_transactions_type_enum"
    `);
    await queryRunner.query(`
      ALTER TYPE "wallet_transactions_type_enum_old"
      RENAME TO "wallet_transactions_type_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "walletId" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "gateway" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ALTER COLUMN "referenceId" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "billId"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "paidToUserId"
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      DROP COLUMN IF EXISTS "paidByUserId"
    `);
  }
}
