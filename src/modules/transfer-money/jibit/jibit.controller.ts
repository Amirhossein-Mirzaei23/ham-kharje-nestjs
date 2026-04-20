import { Body, Controller, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { JibitLoggerInterceptor } from './interceptors/jibit-logger.interceptor';
import { JibitExceptionFilter } from './exceptions/jibit-exception.filter';
import { JibitTransferService } from './jibit-transfer.service';

@Controller('jibit')
@UseInterceptors(JibitLoggerInterceptor)
@UseFilters(JibitExceptionFilter)
export class JibitController {
  constructor(private readonly transferService: JibitTransferService) {}

  @Post('transfer')
  async transfer(@Body() dto: CreateTransferDto) {
    return this.transferService.transfer(dto);
  }
}
