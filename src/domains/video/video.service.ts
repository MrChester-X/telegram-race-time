import { Injectable } from '@nestjs/common';
import { Driver } from '../parser/driver.class';
import axios from 'axios';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as ffmpeg from 'fluent-ffmpeg';
import { loadESLint } from 'eslint';

@Injectable()
export class VideoService {
  async parse(opt: { driver: Driver; url?: string; inputPath?: string; offset: number }) {
    const id = uuidv4();
    const fontPath = './temp/Menlo-Regular.ttf';
    const inputPath = `./temp/input_${id}.mp4`;
    const outputPath = `./temp/output_${id}.mp4`;

    if (opt.inputPath) {
      fs.copyFileSync(opt.inputPath, inputPath);
    } else if (opt.url) {
      await this.download(opt.url, inputPath);
    } else {
      throw new Error();
    }

    const command = ffmpeg(inputPath);
    const filters: any[] = [];
    opt.driver.laps.forEach((lap, index, laps) => {
      const lines = [
        { text: index ? laps[index - 1].toVideoText() : '', size: 25, yOffset: 0 },
        { text: lap.toVideoText(), size: 35, yOffset: 40 },
        { text: index < laps.length - 1 ? laps[index + 1].toVideoText() : '', size: 25, yOffset: 90 },
      ];
      for (const line of lines) {
        if (!line.text) {
          continue;
        }
        const options = [
          `fontfile='${fontPath}'`,
          `text='${line.text}'`,
          `fontsize=${line.size}`,
          'fontcolor=white',
          'x=w-text_w-(w/30)',
          `y=(h/10)+${line.yOffset}`,
          'shadowcolor=black',
          'shadowx=2',
          'shadowy=2',
          'borderw=1',
          'bordercolor=black',
          // 'box=1',
          // 'boxcolor=0x000000@0.5',
          `enable='between(t,${lap.getAbsoluteStartTime() + opt.offset},${lap.getAbsoluteEndTime() + opt.offset})'`,
        ].join(':');

        filters.push({
          filter: 'drawtext',
          options: options,
        });
      }
    });

    await new Promise((resolve, reject) => {
      command.videoFilters(filters).output(outputPath).on('end', resolve).on('error', reject).run();
    });
    fs.rmSync(inputPath);

    return outputPath;
  }

  async download(url: string, filePath: string) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      response.data.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
