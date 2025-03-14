import { Controller, Get, Query } from '@nestjs/common';
import { ParserService } from './parser.service';

@Controller('parser')
export class ParserController {
  constructor(private readonly parserService: ParserService) {}

  @Get()
  async get(@Query('url') url: string, @Query('lastUrl') lastUrl?: string) {
    const raceUrl = url.includes('heats/') ? url : await this.parserService.findUrl(url);
    const raceObj = await this.parserService.parsePage(raceUrl);
    const race = raceObj.race;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    race.drivers.forEach((driver) => driver.laps.forEach((lap) => (lap.driver = undefined)));
    return race;
  }
}
