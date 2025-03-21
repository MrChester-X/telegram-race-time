import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Driver } from './classes/driver.class';
import { DriverLap } from './classes/driver-lap.class';
import { Utils } from '../utils/utils.class';
import { Race } from './classes/race.class';

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

  async parsePage(url: string, reqName?: string, pitlane: string[] = []) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const changes: { [id: string]: string } = {
      // '6': '3',
      // '10': '8',
      // '8': '14',
      // '4': '7',
      // '2': '2',
      // '12': '9',
      // '1': '13',
      // '9': '1',
      // '13': '12', // убрали
      // '14': '10',
      // '3': '4', // питы
      // '7': '6', // питы
    };
    const getRealKart = (kart: string) => {
      if (kart in changes) {
        return changes[kart];
      }
      return kart;
    };

    const drivers: Driver[] = [];
    const matches: Driver[] = [];
    const kartNumbers: string[] = [];
    $('thead tr')
      .eq(2)
      .find('th')
      .each((index, element) => {
        if (index === 0) return;
        const kart = $(element).find('.kart').text().trim();
        kartNumbers.push(getRealKart(kart));
      });
    $('table thead tr:nth-child(2) th[scope="col"]').each((index, element) => {
      const name = $(element).text().trim();
      const driver = new Driver(index, name, kartNumbers[index]);
      driver.karts.push(driver.kart);
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

    // const pitlaneStartText = $('#pitlane_karts').text().trim();
    // const pitlane = pitlaneStartText.split(',');
    // const pitlane = [getRealKart('7'), getRealKart('10')];

    const startPitlane = pitlane.slice();
    const laps = drivers
      .reduce((acc, driver) => [...acc, ...driver.laps], [])
      .sort((a, b) => a.getAbsoluteStartTime() - b.getAbsoluteStartTime());
    for (const lap of laps) {
      // console.log(lap.driver.name, lap.driver.kart, lap.count, lap.time);
      if (lap.isPit()) {
        console.log(`До питов: <- ${pitlane.join(', ')} (карт ${lap.driver.kart} ${lap.driver.name})`);
        const kart = lap.driver.kart;
        lap.driver.kart = pitlane[0];
        lap.driver.karts.push(lap.driver.kart);
        for (let i = 0; i < pitlane.length - 1; i++) {
          pitlane[i] = pitlane[i + 1];
        }
        pitlane[pitlane.length - 1] = kart;
        console.log(`После питов: <- ${pitlane.join(', ')} (карт ${lap.driver.kart} ${lap.driver.name})`);
      }
    }

    const race = new Race([startPitlane]);
    drivers.forEach((driver) => race.addDriver(driver));

    return { race, driver };
  }
}
