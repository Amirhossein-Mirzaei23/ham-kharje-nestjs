import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors({
    origin: '*', // آدرس frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // اگر نیاز به ارسال کوکی یا auth هست
  });
  app.useStaticAssets(join('/app/uplds'), {
    prefix: '/uploads',
    setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
  });
  // process.env.SERVER_URL = 'https://dong-api.liara.run';
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
