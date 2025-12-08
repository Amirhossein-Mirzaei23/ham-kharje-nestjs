import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { BillService } from "./bills.service";
import { CreateBillDto } from "./dto/bills.dto";

@Controller('bills')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  createBill(@Body() dto: CreateBillDto) {
    return this.billService.createBill(dto);
  }

  @Patch(':id/pay')
  payBill(@Param('id',ParseIntPipe) id: number, @Body('amount') amount: number) {
    return this.billService.payBill(id, amount);
  }

  @Get('user/:id')
  listUserDebts(@Param('id',ParseIntPipe) userId: number) {
    return this.billService.listUserDebts(userId);
  }
}
