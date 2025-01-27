import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigType } from '@nestjs/config';
import TelegramConfig from './telegram.config';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      inject: [TelegramConfig.KEY],
      imports: [ConfigModule.forFeature(TelegramConfig)],
      useFactory: (config: ConfigType<typeof TelegramConfig>) => config,
    }),
  ],
})
export class TelegramModule {}
