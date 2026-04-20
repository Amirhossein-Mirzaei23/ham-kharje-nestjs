import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JibitController } from './jibit.controller';
import { JibitTokenService } from './jibit-token.service';
import { JibitTransferService } from './jibit-transfer.service';

@Module({
  imports: [HttpModule],
  controllers: [JibitController],
  providers: [JibitTokenService, JibitTransferService],
  exports: [JibitTokenService, JibitTransferService],
})
export class JibitModule {}
