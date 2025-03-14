import { Driver } from './driver.class';
import { Utils } from '../utils/utils.class';

export class DriverLap {
  constructor(public driver: Driver, public count: number, public time: number, public stintText?: string) {}

  getAbsoluteStartTime(): number {
    return this.driver.laps.slice(0, this.count).reduce((total, lap) => total + lap.time, 0);
  }

  getAbsoluteEndTime(): number {
    return this.driver.laps.slice(0, this.count + 1).reduce((total, lap) => total + lap.time, 0);
  }

  toText(offset = 0): string {
    const startTimeText = Utils.timeToText(this.getAbsoluteStartTime() + offset, true);
    return `№${this.count + 1} ${Utils.timeToText(this.time)} (на ${startTimeText})`;
  }

  toVideoText(): string {
    return `№${this.count + 1} ${Utils.timeToText(this.time)}`;
  }

  isPit(): boolean {
    return this.time >= 50 && this.time <= 80;
  }
}
