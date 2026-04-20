import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { AuthModule } from './modules/authentication/authentication.module';
import { FriendshipModule } from './modules/friendship/friendship.module';
import { BillModule } from './modules/bills-management/bills.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UploadModule } from './modules/upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PushModule } from './push/push.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { InviteModule } from './modules/invite/invite.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/authentication/jwt-auth.guard';
import { JibitModule } from './modules/transfer-money/jibit/jibit.module';

@Module({
  imports: [
    // ConfigModule for .env support
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),

    // TypeORM config using env variables
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(config.get<number>('DATABASE_PORT', 5432)),
        username: config.get<string>('DATABASE_USERNAME', 'postgres'),
        password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
        database: config.get<string>('DATABASE_NAME', 'mydb'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Only sync in dev
      }),
    }),

    // Serve static uploads
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Modules
    UsersModule,
    AuthModule,
    FriendshipModule,
    BillModule,
    GroupsModule,
    PushModule,
    UploadModule,
    WalletModule,
    InviteModule,
    JibitModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({
        path: 'users/*splat',
        method: RequestMethod.ALL,
      });
  }
}
