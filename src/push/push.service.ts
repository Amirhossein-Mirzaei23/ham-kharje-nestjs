import { Injectable } from '@nestjs/common';
import dns from 'dns';
import webpush, { PushSubscription } from 'web-push';

dns.setDefaultResultOrder('ipv4first');

@Injectable()
export class PushService {
  constructor() {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    console.log('setVapidDetails done');
    console.log('Public Key', process.env.VAPID_PUBLIC_KEY);
    console.log('SUBJECT Key', process.env.VAPID_SUBJECT);
    console.log('Public Key', process.env.NODE_ENV);
  }

  async sendNotification(
    subscription: PushSubscription,
    payload: { title: string; body: string },
    onDeadSubscription?: () => Promise<void>,
  ): Promise<boolean> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 60,
      });
      return true;
    } catch (err: any) {
      // subscription مرده یا revoke شده
      if (err.statusCode === 404 || err.statusCode === 410) {
        if (onDeadSubscription) {
          await onDeadSubscription();
        }
      }

      console.error('Push Error:', err);
      return false;
    }
  }
}

// import { Injectable } from '@nestjs/common';
// import dns from 'dns';
// import webpush from 'web-push';

// @Injectable()
// export class PushService {
//   constructor() {
//     webpush.setVapidDetails(
//       'mailto:your-email@example.com',
//       process.env.VAPID_PUBLIC_KEY,
//       process.env.VAPID_PRIVATE_KEY
//     );
//   }

//   async sendNotification(subscription: any, payload: any) {

//      dns.setDefaultResultOrder('ipv4first');

//     try {
//       await webpush.sendNotification(subscription, JSON.stringify(payload),{
//           TTL: 60,
//         });
//       return true;
//     } catch (err) {
//         if (err.statusCode === 404 || err.statusCode === 410) {
//     // ❌ subscription مرده
//     await deleteSubscription(sub);
//   }

//       console.error('Push Error', err);
//       return false;
//     }
//   }
// }
