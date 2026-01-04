import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    // const webpush = require('web-push');
// ساخت VAPID key جدید
// const vapidKeys = webpush.generateVAPIDKeys();



console.log('Public Key',process.env.VAPID_PUBLIC_KEY);
console.log('SUBJECT Key',process.env.VAPID_SUBJECT);
console.log('Public Key',process.env.NODE_ENV);


    return this.appService.getHello();
  }
}
