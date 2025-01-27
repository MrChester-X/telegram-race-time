import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { ParserService } from '../parser/parser.service';
import { Utils } from '../utils/utils.class';
import { DriverLap } from '../parser/driver-lap.class';
import { VideoService } from '../video/video.service';
import * as fs from 'node:fs';
import { S3Client } from '@aws-sdk/client-s3';

@Update()
export class HandlerController {
  constructor(
    private parserService: ParserService,
    private videoService: VideoService,
    @InjectBot() private bot: Telegraf,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    console.log(ctx.msg);
    await ctx.reply(`Привет! Для получения информации по заезду введи сообщение следующего вида:
    
1) Ссылка на заезд
2) Часть своего ника (например, BoDuTeJlb)
3) Тайминг первой отсечки (например, 00:15.234 или 00:12 или 14.123 или 16)

Пример здорового запроса:

https://timing.batyrshin.name/tracks/premium/heats/68525
God
0:15

По всем багам и предложениям: @back_coder
`);
  }

  @On('message')
  async message(@Ctx() ctx: Context) {
    try {
      // Попытки удалить фотографию бота
      // const botInfo = await this.bot.telegram.getMe();
      // console.log(botInfo);
      // await this.bot.telegram.deleteChatPhoto('7430710863');

      if (!ctx.message) {
        throw new Error('Не вижу сообщения');
      }
      console.log('message', ctx.message);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const inputText = ctx.message?.text || ctx.message?.caption;
      if (!inputText) {
        throw new Error('Нет текста');
      }

      if (inputText.startsWith('sub')) {
        return await this.parseRaceSubscription(ctx, inputText);
      }

      const [url, name, offsetText, inputVideoPath] = inputText.split('\n');
      const { driver } = await this.parserService.parsePage(url, name);
      const offset = Utils.timeFromText(offsetText);
      if (!offset) {
        throw new Error('Неверно введено начало отсечки');
      }

      const lapsToText = (laps: DriverLap[]) => laps.map((lap) => lap.toText(offset)).join('\n');

      console.log(driver.laps.map((lap) => lap.time));
      let text = `${driver.name}\n\n`;

      const bestLaps = driver.getSortedLaps().slice(0, 5);
      text += `Топ 5 лучших кругов:\n${lapsToText(bestLaps)}\n\n`;

      let middleLaps = driver.getSortedLaps();
      const middleIndex = Math.floor(middleLaps.length / 2);
      middleLaps = middleLaps.slice(middleIndex - 3, middleIndex + 3);
      text += `Топ 5 медианных кругов:\n${lapsToText(middleLaps)}\n\n`;

      const worstLaps = driver.getSortedLaps().slice(-5);
      text += `Топ 5 худших кругов:\n${lapsToText(worstLaps)}\n\n`;

      const lastLaps = driver.laps.slice(-3);
      text += `3 последних круга:\n${lapsToText(lastLaps)}\n\n`;

      text += `Все круги:\n${lapsToText(driver.laps)}\n\n`;

      await ctx.reply(text);

      const videoUrl =
        'video' in ctx.message ? (await ctx.telegram.getFileLink(ctx.message.video.file_id)).href : undefined;
      if (videoUrl || inputVideoPath) {
        const videoPath = await this.videoService.parse({ driver, offset, url: videoUrl, inputPath: inputVideoPath });
        if (videoUrl) {
          await ctx.replyWithVideo({ source: fs.createReadStream(videoPath) });
          fs.rmSync(videoPath);
        } else {
          await ctx.reply('Закончил монтаж');
        }
        const client = new S3Client({
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'sosi',
            secretAccessKey: 'sosi',
          },
          forcePathStyle: true,
        });
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(`Возникла ошибка:\n${error}`);
      throw error;
    }
  }

  async parseRaceSubscription(ctx: Context, inputText: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_command, name] = inputText.trim().split(' ');
    await ctx.reply(`Слежу за ${name}`);
  }
}
