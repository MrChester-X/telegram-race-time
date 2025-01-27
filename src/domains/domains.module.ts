import { Module } from '@nestjs/common';
import { HandlerModule } from './handler/handler.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [HandlerModule, VideoModule],
})
export class DomainsModule {}
