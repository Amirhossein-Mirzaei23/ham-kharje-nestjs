import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PushService } from './push.service';
import { UsersService } from 'src/modules/users/users.service'; 
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService,
    private readonly usersService: UsersService,

  ) {}

  @Post('subscribe')
  async subscribe(@Body() body: { userId: number; subscription: any }) {
    const { userId, subscription } = body;
    const user  = await this.usersService.findOne(userId)   
    if (!user) {
        throw new BadRequestException('کاربر مورد نظر یافت نشد')
    }
    user.subscription = subscription
    this.usersService.update(userId,user)
    return { success: true };
  }

  @Post('send')
  async send(
    @Body() body: { userId: string; title: string; message: string }
  ) {
    const { userId, title, message } = body;

    const user  = await this.usersService.findOne(Number(userId))    
   if (!user) {
        throw new BadRequestException('کاربر یاقت نشد .')
    }
    let  subscription 
   if (user.subscription) {
    subscription = JSON.parse(user?.subscription)
   } 
    console.log('subscription',subscription);
    
    if (!subscription) {
        throw new BadRequestException('این کاربر اجازه ارسال نوتیفیکشین را محدود کرده است.')
    }
    const payload = { title, body: message };
    await this.pushService.sendNotification(subscription, payload);
    return { success: true,message:'نوتیفیکشین با موفقیت ارسال گردید.' };
  }
}
