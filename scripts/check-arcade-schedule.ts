import assert from 'node:assert';
import { generateWeek } from '../src/features/arcade/schedule/services/arcade-schedule.service';

const days = ['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13'];
for (let i = 0; i < 200; i++) {
  const w = generateWeek(days);
  assert.deepStrictEqual(Object.keys(w), days);
  assert.strictEqual(new Set(Object.values(w)).size, 4, JSON.stringify(w));
}
console.log('ok', generateWeek(days));
