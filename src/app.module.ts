import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './app/telegram/telegram.module';
import { DomainsModule } from './domains/domains.module';

@Module({
  imports: [ConfigModule.forRoot(), TelegramModule, DomainsModule],
})
export class AppModule {}
