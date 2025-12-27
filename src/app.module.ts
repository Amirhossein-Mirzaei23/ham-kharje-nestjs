import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from "./modules/users/users.module"
import { ConfigModule } from '@nestjs/config';  // For .env support
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { AuthModule } from './modules/authentication/authentication.module'; 
import { FriendshipModule } from './modules/friendship/friendship.module';
import { BillModule } from './modules/bills-management/bills.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UploadModule } from './modules/upload/upload.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot(),  // Loads .env
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'etna.liara.cloud',
      port: 33274,
      username: 'root',
      password: 'LlkaosWk8pQPy5p66PBnlYUW',
      database: 'postgres',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],  // Auto-load entities
      synchronize: true,  // Auto-create tables (use false in production)
    }),


    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   host: process.env.DATABASE_HOST,
    //   port: process.env.DATABASE_PORT?  +process.env.DATABASE_PORT : 5432,
    //   username: process.env.DATABASE_USERNAME,
    //   password: process.env.DATABASE_PASSWORD,
    //   database: process.env.DATABASE_NAME,
    //   entities: [__dirname + '/**/*.entity{.ts,.js}'],  // Auto-load entities
    //   synchronize: true,  // Auto-create tables (use false in production)
    // }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads', // URL prefix
    }),

    UsersModule,
    AuthModule,
    FriendshipModule,
    BillModule,
    GroupsModule,
    PushModule,
    UploadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule  implements NestModule  {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({
        path:'users/*splat',
        method:RequestMethod.ALL
      });
  }

}