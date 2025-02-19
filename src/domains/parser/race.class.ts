import { Driver } from './driver.class';

export class Race {
  drivers: Driver[] = [];

  constructor(public pitlane?: string[][]) {}

  addDriver(driver: Driver) {
    this.drivers.push(driver);
  }
}
