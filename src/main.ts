import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.enableCors({
    origin: '*', // آدرس frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // اگر نیاز به ارسال کوکی یا auth هست
  });
  process.env.SERVER_URL = 'https://dong-api.liara.run';
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
