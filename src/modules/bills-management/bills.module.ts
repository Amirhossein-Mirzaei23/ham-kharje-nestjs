import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillService } from './bills.service'; 
import { User } from '../users/entities/user.entity';
import { BillController } from './bills.controller';
import { Bill } from './entities/bill.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, User, Group])],
  providers: [BillService],
  controllers: [BillController],
})
export class BillModule {}
