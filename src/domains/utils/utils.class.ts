export class Utils {
  static timeFromText(timeText: string) {
    if (!timeText) {
      return null;
    }
    if (timeText.includes(':')) {
      const [minutes, seconds] = timeText.split(':');
      return Number.parseInt(minutes) * 60 + Number.parseFloat(seconds);
    }
    return Number.parseFloat(timeText);
  }

  static timeToText(time: number, showZeroMinutes = false) {
    const seconds = time % 60;
    const secondsText = Utils.normalizeTime(Utils.normalizeSeconds(seconds));
    const minutes = Math.floor(time / 60) % 60;
    const minutesText = Utils.normalizeTime(minutes);
    const hours = Math.floor(time / 3600);
    const hoursText = Utils.normalizeTime(hours);
    if (hours) {
      return `${hoursText}:${minutesText}:${secondsText}`;
    }
    if (minutes || showZeroMinutes) {
      return `${minutesText}:${secondsText}`;
    }
    return secondsText;
  }

  static normalizeTime(time: string | number) {
    const timeText = `${time}`;
    const [integer, decimal] = timeText.split('.');
    const normalizedInteger = integer.padStart(2, '0');
    if (decimal) {
      return `${normalizedInteger}.${decimal}`;
    }
    return normalizedInteger;
  }

  static normalizeSeconds(seconds: number) {
    return seconds.toFixed(3);
  }
}
