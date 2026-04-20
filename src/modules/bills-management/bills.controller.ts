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
import { GetUserId } from '../authentication/get-user.decorator';
import { BillService } from './bills.service';
import { CreateBillDto } from './dto/bills.dto';
import { PayBillDto } from '../wallet/application/dto/pay-bill.dto';
import { DeleteBillDto } from '../wallet/application/dto/delete-bill.dto';

@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  createBill(@Body() dto: CreateBillDto) {
    return this.billService.createBill(dto);
  }

  @Patch(':id/pay')
  payBill(
    @Param('id', ParseIntPipe) id: number,
    @GetUserId() userId: number,
    @Body() dto: PayBillDto,
  ) {
    return this.billService.payBill(id, userId, dto);
  }

  @Get('user/:id')
  listUserDebts(@Param('id', ParseIntPipe) userId: number) {
    return this.billService.listUserDebts(userId);
  }

  @Post('delete')
  deleteBill(@Body() dto: DeleteBillDto,) {
    return this.billService.deleteBill(dto);
  }
}
