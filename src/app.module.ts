import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { pinoConfig } from './shared/observability/pino.config';
import { MessagingModule } from './shared/messaging/messaging.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    LoggerModule.forRoot(pinoConfig),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URL',
          'mongodb://execution:execution@localhost:27017/execution_db?authSource=admin',
        ),
      }),
      inject: [ConfigService],
    }),
    MessagingModule,
    ExecutionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
