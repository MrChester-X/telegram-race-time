import { Ctx, InjectBot, On, Start, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { ParserService } from '../parser/parser.service';
import { Utils } from '../utils/utils.class';
import { DriverLap } from '../parser/classes/driver-lap.class';
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
    // console.log(ctx.msg);
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

      // console.log('message', ctx.message);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const inputText = ctx.message?.text || ctx.message?.caption;
      if (!inputText) {
        throw new Error('Нет текста');
      }

      if (inputText.startsWith('sub')) {
        return await this.parseRaceSubscription(ctx, inputText);
      }
      if (inputText.startsWith('pit')) {
        return await this.parseRacePits(ctx, inputText);
      }
      if (inputText.startsWith('sound2')) {
        return await this.parseRaceSound(ctx, inputText);
      }

      const [url, name, offsetText, inputVideoPath] = inputText.split('\n');
      const { driver } = await this.parserService.parsePage(url, name);
      const offset = Utils.timeFromText(offsetText);
      if (!offset) {
        throw new Error('Неверно введено начало отсечки');
      }

      const lapsToText = (laps: DriverLap[]) => laps.map((lap) => lap.toText(offset)).join('\n');

      // console.log(driver.laps.map((lap) => lap.time));
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

      text += `Все круги:\n${lapsToText(driver.laps.slice(0, 20))}\n\n`;

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
      // throw error;
    }
  }

  async parseRaceSubscription(ctx: Context, inputText: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_command, name] = inputText.trim().split(' ');
    await ctx.reply(`Слежу за ${name}`);
  }

  async parseRaceSound(ctx: Context, inputText: string) {
    const [_command, driverName, url] = inputText.trim().split(' ');
    if (!url) return;
    let lastLapCount = -1;
    let lastPitState: string[] = [];
    ctx.reply(`Слежу за ${driverName}`);
    setInterval(async () => {
      try {
        const raceUrl = await this.parserService.findUrl(url);
        console.log(raceUrl);
        const { race } = await this.parserService.parsePage(raceUrl);
        const driver = race.drivers.find((driver) => driver.name.includes(driverName));
        if (!driver) {
          return;
        }
        const lastLap = driver.laps.at(-1)!;
        const pitlane = race.pitlane![0].slice();
        if (lastLap.count != lastLapCount) {
          const stintsCount = driver.laps.filter((lap) => lap.isPit()).length + 1;
          const stintLaps =
            stintsCount <= 1
              ? driver.laps.length
              : Math.max(
                  driver.laps
                    .slice()
                    .reverse()
                    .findIndex((lap) => lap.isPit()),
                  0,
                ) + 1;
          const time = lastLap.time.toFixed(2);
          ctx.reply(`Круг ${stintLaps} проехал за ${time}`);
          Utils.makeSound(`Круг ${stintLaps}. Время ${time}. В питах ${pitlane.join('. ')}. ${pitlane.join('. ')}`);
          lastLapCount = lastLap.count;
        }
        if (race.pitlane && lastPitState[0] != race.pitlane[0][0]) {
          ctx.reply(`Питы обновились: ${pitlane.join(',')}`);
          // Utils.makeSound(`Питы ${pitlane.join(' и ')}`);
          lastPitState = pitlane;
        }
      } catch (error) {
        console.warn(error);
      }
    }, 3e3);
  }

  async parseRacePits(ctx: Context, inputText: string) {
    const opt: { [index: string]: string } = {
      '35': '🟡🟢 26.798 Супер плохо, одно из колес напроч сдуто',
      '44': '🟢 26.966 + Кайф, в начале гонке очень хорошо еду на нем',
      '31': '🟡🟢 26.975 Скользкий, тяжелый, довольно быстрый (быстрая в начале, потом упадет)',
      '34': '🟡 По холодной ниче так, ехал 27.4',
      '41': '🟡🟢 27.055 + Ракета, очень хорошо (быстрая в начале, потом упадет)',
      '42': '🟡🟢 26.981 + Чуть выше среднего',
      '36': '🟢🟢 ?Эрик: ред флаг, тормоза плохие, карт плохой 🔵',
      '37': '🟡🟢 26.953 Эрик: средний, тяжелый довольно, скользкий',
      '43': '🔵 27.352 !ПИЗДЕЦ! Эрик: средний, неплохой, рулежный (новый двигатель) (подняли)',
      '39': '🔴 27.175 Эрик: ниже среднего, Никита проехал 27.4, очень такое спорное',
      '33': '🟡 27.002 Эрик: средний',
      '32': '🟡 27.077 Эрик: неплохой, возможно ракета, но у меня на тайм атаке не получилось',
      '38': '🟡🟢',
      '40': '🟡🟢',
    };

    const kartDesc = (kart: string) => {
      return opt[kart] || 'unknown';
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_command, url] = inputText.trim().split(' ');
    const { race } = await this.parserService.parsePage(url);
    let message = '';
    if (race.pitlane) {
      message += `В питах:\n${race.pitlane[0][0]} - ${kartDesc(race.pitlane[0][0])}\n${race.pitlane[0][1]} - ${kartDesc(
        race.pitlane[0][1],
      )}\n\n`;
    }
    message += race.drivers
      .map((driver, index) => {
        const totalLaps = 60;
        const minStintLaps = 10;
        const laps = driver.laps.length;
        const stintsMaxCount = 3;
        const stintsCount = driver.laps.filter((lap) => lap.isPit()).length + 1;
        const stintLaps =
          stintsCount <= 1
            ? laps
            : Math.max(
                driver.laps
                  .slice()
                  .reverse()
                  .findIndex((lap) => lap.isPit()),
                0,
              );
        const maxStintLaps = totalLaps - (laps - stintLaps) - (stintsMaxCount - stintsCount) * minStintLaps;
        return `${index + 1}. ${
          driver.name
        }:\nКруги: ${laps}/${totalLaps} | Стинт №${stintsCount}: ${stintLaps}/${maxStintLaps}\n${
          driver.kart
        } - ${kartDesc(driver.kart)}\n`;
      })
      .join('\n');
    await ctx.reply(message);
  }
}
