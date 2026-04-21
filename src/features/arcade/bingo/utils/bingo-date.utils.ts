import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { BINGO_HOUR_START, BINGO_HOUR_END } from '../constants/bingo.constants';

const TZ = 'Europe/Paris';

export function generateBingoDate(): Date {
  const nowParis = toZonedTime(new Date(), TZ);
  const year = nowParis.getFullYear();
  const month = nowParis.getMonth();
  const day = nowParis.getDate();

  const hourRange = BINGO_HOUR_END - BINGO_HOUR_START;
  const hour = BINGO_HOUR_START + Math.floor(Math.random() * (hourRange + 1));
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  const naiveParis = new Date(year, month, day, hour, minute, second);
  return fromZonedTime(naiveParis, TZ);
}
