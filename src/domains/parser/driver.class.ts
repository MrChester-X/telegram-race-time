import { DriverLap } from './driver-lap.class';
import { DriverDto } from './dto/DriverDto';

export class Driver {
  constructor(public index: number, public name: string, public kart: string, public laps: DriverLap[] = []) {}

  karts: string[] = [];

  addLap(driverLap: DriverLap) {
    this.laps.push(driverLap);
  }

  getSortedLaps(): DriverLap[] {
    return [...this.laps].sort((a, b) => a.time - b.time);
  }

  toDto(): DriverDto {
    return {
      index: this.index,
      name: this.name,
      startKart: this.kart,
      karts: this.karts,
      laps: this.laps.map((lap) => lap.toDto()),
    };
  }
}
