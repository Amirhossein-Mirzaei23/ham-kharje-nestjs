import { Injectable } from '@nestjs/common';
import webpush from 'web-push';

@Injectable()
export class PushService {
  constructor() {
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  async sendNotification(subscription: any, payload: any) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('Push Error', err);
      return false;
    }
  }
}
