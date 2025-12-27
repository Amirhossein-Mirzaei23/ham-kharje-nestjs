import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [UsersModule],  // ✅ اضافه شد
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
