import { Driver } from './driver.class';

export class Race {
  drivers: Driver[] = [];

  addDriver(driver: Driver) {
    this.drivers.push(driver);
  }
}
