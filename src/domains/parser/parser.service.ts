import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Driver } from './driver.class';
import { DriverLap } from './driver-lap.class';
import { Utils } from '../utils/utils.class';
import { Race } from './race.class';

@Injectable()
export class ParserService {
  async parsePage(url: string, reqName: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const drivers: Driver[] = [];
    const matches: Driver[] = [];
    $('table thead tr:nth-child(2) th[scope="col"]').each((index, element) => {
      const name = $(element).text().trim();
      const driver = new Driver(index, name);
      drivers.push(driver);
      if (name.toLowerCase().includes(reqName.toLowerCase())) {
        matches.push(driver);
      }
    });
    if (!matches.length) {
      throw new Error('Такое имя не найдено');
    }
    if (matches.length >= 2) {
      throw new Error(
        `Найдено более одного совпадения по заданному имени (${matches.map((driver) => driver.name).join(', ')})`,
      );
    }
    const driver = matches[0];

    $('tbody tr').each((index, row) => {
      $(row)
        .find('td')
        .each((indexDriver, cell) => {
          const cellText = $(cell).contents().first().text().trim();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [timeText, _stintText] = cellText.split(' ');
          const time = Utils.timeFromText(timeText);
          if (!time) {
            return;
          }
          drivers[indexDriver].addLap(new DriverLap(driver, index, time));
        });
    });

    const race = new Race();
    drivers.forEach((driver) => race.addDriver(driver));
    return { race, driver };
  }
}
