import { Driver } from './driver.class';
import { RaceDto } from './dto/RaceDto';

export class Race {
  drivers: Driver[] = [];

  constructor(public pitlane?: string[][]) {}

  addDriver(driver: Driver) {
    this.drivers.push(driver);
  }

  toDto(): RaceDto {
    return {
      pitlane: this.pitlane?.[0],
      drivers: this.drivers.map((driver) => driver.toDto()),
    };
  }
}
