import { Module } from '@nestjs/common';
import { TelegramModule } from '../../app/telegram/telegram.module';
import { HandlerController } from './handler.controller';
import { ParserModule } from '../parser/parser.module';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [TelegramModule, ParserModule, VideoModule],
  providers: [HandlerController],
})
export class HandlerModule {}
