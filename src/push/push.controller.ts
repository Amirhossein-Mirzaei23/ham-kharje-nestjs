import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { PushService } from './push.service';
import { UsersService } from 'src/modules/users/users.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { SendPushDto } from './dto/send-push.dto';

@Controller('push')
export class PushController {
  constructor(
    private readonly pushService: PushService,
    private readonly usersService: UsersService,
  ) {}

  // =========================
  // Subscribe
  // =========================
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      throw new BadRequestException('کاربر مورد نظر یافت نشد');
    }

  user.subscription = {
    endpoint: dto.subscription.endpoint,
    keys: dto.subscription.keys,
  };
    await this.usersService.update(user.id, user);
    const user2 = await this.usersService.findOne(dto.userId);
    return { success: true ,subscibe:user2 };
  }

  // =========================
  // Unsubscribe
  // =========================
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      throw new BadRequestException('کاربر مورد نظر یافت نشد');
    }

    if (
      user.subscription &&
      user.subscription.endpoint === dto.endpoint
    ) {
      user.subscription = null;
      await this.usersService.update(user.id, user);
    }

    return { success: true };
  }

  // =========================
  // Send Push
  // =========================
  @Post('send')
  async send(@Body() dto: SendPushDto) {
    const user = await this.usersService.findOne(dto.userId);
    if (!user) {
      throw new BadRequestException('کاربر یافت نشد');
    }
    
    if (!user.subscription) {
      throw new BadRequestException(
        'این کاربر اجازه دریافت نوتیفیکیشن را نداده است',
      );
    }

    const payload = {
      title: dto.title,
      body: dto.message,
    };

    const sent = await this.pushService.sendNotification(
      user.subscription,
      payload,
      async () => {
        // auto cleanup subscription مرده
        user.subscription = null;
        await this.usersService.update(user.id, user);
      },
    );

    if (!sent) {
      throw new BadRequestException(
        'ارسال نوتیفیکیشن ناموفق بود',
      );
    }

    return {
      success: true,
      message: 'نوتیفیکیشن با موفقیت ارسال شد',
    };
  }
}








// import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
// import { PushService } from './push.service';
// import { UsersService } from 'src/modules/users/users.service'; 
// @Controller('push')
// export class PushController {
//   constructor(private readonly pushService: PushService,
//     private readonly usersService: UsersService,

//   ) {}

//   @Post('subscribe')
//   async subscribe(@Body() body: { userId: number; subscription: any }) {
//     const { userId, subscription } = body;
//     const user  = await this.usersService.findOne(userId)   
//     if (!user) {
//         throw new BadRequestException('کاربر مورد نظر یافت نشد')
//     }
//     user.subscription = subscription
//     this.usersService.update(userId,user)
//     return { success: true };
//   }
//   @Post('remove-subscribe')
// async unsubscribe(@Body() body: { userId: number }) {
//   const { userId } = body;

//   const user = await this.usersService.findOne(userId);
//   if (!user) {
//     throw new BadRequestException('کاربر مورد نظر یافت نشد');
//   }

//   user.subscription = null;
//   await this.usersService.update(userId, user);

//   return { success: true };
// }

//   @Post('send')
//   async send(
//     @Body() body: { userId: string; title: string; message: string }
//   ) {
//     const { userId, title, message } = body;

//     const user  = await this.usersService.findOne(Number(userId))    
//    if (!user) {
//         throw new BadRequestException('کاربر یاقت نشد .')
//     }
//     let  subscription 
//    if (user.subscription) {
//     subscription = JSON.parse(user?.subscription)
//    } 
//     console.log('subscription',subscription);
    
//     if (!subscription) {
//         throw new BadRequestException('این کاربر اجازه ارسال نوتیفیکشین را محدود کرده است.')
//     }
//     const payload = { title, body: message };
//     await this.pushService.sendNotification(subscription, payload);
//     return { success: true,message:'نوتیفیکشین با موفقیت ارسال گردید.' };
//   }
// }
