export const PARIS_TZ = 'Europe/Paris';

export interface DayChunk {
  dateYMD: string;
  seconds: number;
}

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PARIS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toParisDayYMD(date: Date): string {
  return ymdFormatter.format(date);
}

export function parisMidnightUTC(dayYMD: string): Date {
  const [y, m, d] = dayYMD.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offsetMinutes = parisOffsetMinutes(new Date(guess));
  return new Date(guess - offsetMinutes * 60_000);
}

function parisOffsetMinutes(utcDate: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utcDate);

  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);

  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - utcDate.getTime()) / 60_000);
}

export function splitSessionByDay(start: Date, end: Date): DayChunk[] {
  if (end.getTime() <= start.getTime()) return [];

  const chunks: DayChunk[] = [];
  let cursor = start;

  while (cursor < end) {
    const dayYMD = toParisDayYMD(cursor);
    const nextMidnight = nextParisMidnightAfter(cursor);
    const chunkEnd = nextMidnight < end ? nextMidnight : end;
    const seconds = Math.round((chunkEnd.getTime() - cursor.getTime()) / 1000);

    if (seconds > 0) chunks.push({ dateYMD: dayYMD, seconds });
    cursor = chunkEnd;
  }

  return chunks;
}

function nextParisMidnightAfter(date: Date): Date {
  const ymd = toParisDayYMD(date);
  const todayMidnight = parisMidnightUTC(ymd);
  const [y, m, d] = ymd.split('-').map(Number);
  const nextYmd = toParisDayYMD(new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)));
  const nextMidnight = parisMidnightUTC(nextYmd);
  return nextMidnight > todayMidnight ? nextMidnight : new Date(todayMidnight.getTime() + 86_400_000);
}
