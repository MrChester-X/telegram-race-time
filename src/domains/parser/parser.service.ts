import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Driver } from './driver.class';
import { DriverLap } from './driver-lap.class';
import { Utils } from '../utils/utils.class';
import { Race } from './race.class';

@Injectable()
export class ParserService {
  async findUrl(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const urls: string[] = [];
    $(
      'div.list-group.list-group-flush.border-bottom.scrollarea > div.list-group-item.list-group-item-action.py-3.lh-tight',
    ).each((index, element) => {
      const heatElement = $(element);
      const heatLinkElement = heatElement.find('a.text-dark').first();
      const heatLink = heatLinkElement.attr('href') || '';
      urls.push(`https://timing.batyrshin.name${heatLink}`);
      return;
    });
    return urls[0];
  }

  async parsePage(url: string, reqName?: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const drivers: Driver[] = [];
    const matches: Driver[] = [];
    const kartNumbers: string[] = [];
    $('thead tr')
      .eq(2)
      .find('th')
      .each((index, element) => {
        if (index === 0) return;
        const kart = $(element).find('.kart').text().trim();
        kartNumbers.push(kart);
      });
    $('table thead tr:nth-child(2) th[scope="col"]').each((index, element) => {
      const name = $(element).text().trim();
      const driver = new Driver(index, name, kartNumbers[index]);
      drivers.push(driver);
      if (reqName && name.toLowerCase().includes(reqName.toLowerCase())) {
        matches.push(driver);
      }
    });
    console.log(kartNumbers);
    if (reqName) {
      if (!matches.length) {
        throw new Error('Такое имя не найдено');
      }
      if (matches.length >= 2) {
        throw new Error(
          `Найдено более одного совпадения по заданному имени (${matches.map((driver) => driver.name).join(', ')})`,
        );
      }
    }

    const driver = reqName ? matches[0] : drivers[0];

    $('tbody tr').each((index, row) => {
      $(row)
        .find('td')
        .each((indexDriver, cell) => {
          const cellText = $(cell).contents().first().text().trim();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [timeText, stintText] = cellText.split(' ');
          const time = Utils.timeFromText(timeText);
          if (!time) {
            return;
          }
          drivers[indexDriver].addLap(new DriverLap(drivers[indexDriver], index, time, stintText));
        });
    });

    const pitlaneStartText = $('#pitlane_karts').text().trim();
    // const pitlane = pitlaneStartText.split(',');
    // const pitlane = ['5', '3'];
    const pitlane = ['1', '13'];

    const laps = drivers
      .reduce((acc, driver) => [...acc, ...driver.laps], [])
      .sort((a, b) => a.getAbsoluteStartTime() - b.getAbsoluteStartTime());
    for (const lap of laps) {
      // console.log(lap.driver.name, lap.driver.kart, lap.count, lap.time);
      if (lap.time >= 50) {
        const kart = lap.driver.kart;
        console.log(kart, pitlane, lap.driver.name);
        lap.driver.kart = pitlane[0];
        pitlane[0] = pitlane[1];
        pitlane[1] = kart;
        // lap.driver.kart = pitlane[0];
        // pitlane[0] = kart;
      }
    }

    const race = new Race([pitlane]);
    drivers.forEach((driver) => race.addDriver(driver));

    return { race, driver };
  }
}
