import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { BillService } from './bills.service';
import { CreateBillDto } from './dto/bills.dto';
import { PayBillDto } from '../wallet/application/dto/pay-bill.dto';

@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  createBill(@Body() dto: CreateBillDto) {
    return this.billService.createBill(dto);
  }

  @Patch(':id/pay')
  payBill(@Param('id', ParseIntPipe) id: number, @Body() dto: PayBillDto) {
    return this.billService.payBill(id, dto.amount, dto.payerUserId);
  }

  @Get('user/:id')
  listUserDebts(@Param('id', ParseIntPipe) userId: number) {
    return this.billService.listUserDebts(userId);
  }

  @Delete(':id')
  deleteBill(@Param('id') id: string) {
    return this.billService.deleteBill(id);
  }
}
