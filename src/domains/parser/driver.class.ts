import { DriverLap } from './driver-lap.class';

export class Driver {
  constructor(public index: number, public name: string, public laps: DriverLap[] = []) {}

  addLap(driverLap: DriverLap) {
    this.laps.push(driverLap);
  }

  getSortedLaps(): DriverLap[] {
    return [...this.laps].sort((a, b) => a.time - b.time);
  }
}
