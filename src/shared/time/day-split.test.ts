import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSessionByDay, toParisDayYMD, parisMidnightUTC } from './day-split';

const utc = (s: string) => new Date(s);

test('une session dans la même journée parisienne reste en un seul morceau', () => {
  const chunks = splitSessionByDay(utc('2026-01-15T10:00:00Z'), utc('2026-01-15T12:30:00Z'));
  assert.deepEqual(chunks, [{ dateYMD: '2026-01-15', seconds: 9000 }]);
});

test('une session à cheval sur minuit est coupée sur le fuseau de Paris, pas sur UTC', () => {
  // 23h00 UTC = minuit à Paris en hiver
  const chunks = splitSessionByDay(utc('2026-01-15T22:30:00Z'), utc('2026-01-16T00:30:00Z'));
  assert.deepEqual(chunks, [
    { dateYMD: '2026-01-15', seconds: 1800 },
    { dateYMD: '2026-01-16', seconds: 5400 },
  ]);
  assert.equal(chunks.reduce((t, c) => t + c.seconds, 0), 7200, 'aucune seconde ne doit être perdue');
});

test('passage à l\'heure d\'été : la journée ne fait que 23 h', () => {
  const chunks = splitSessionByDay(parisMidnightUTC('2026-03-29'), parisMidnightUTC('2026-03-30'));
  assert.deepEqual(chunks, [{ dateYMD: '2026-03-29', seconds: 23 * 3600 }]);
});

test('passage à l\'heure d\'hiver : la journée fait 25 h', () => {
  const chunks = splitSessionByDay(parisMidnightUTC('2026-10-25'), parisMidnightUTC('2026-10-26'));
  assert.deepEqual(chunks, [{ dateYMD: '2026-10-25', seconds: 25 * 3600 }]);
});

test('une session de plusieurs jours produit un morceau par jour', () => {
  const chunks = splitSessionByDay(utc('2026-01-15T22:00:00Z'), utc('2026-01-18T02:00:00Z'));
  assert.deepEqual(chunks.map((c) => c.dateYMD), ['2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18']);
  assert.equal(chunks.reduce((t, c) => t + c.seconds, 0), 52 * 3600);
});

test('une session de durée nulle ou négative ne produit rien', () => {
  assert.deepEqual(splitSessionByDay(utc('2026-01-15T10:00:00Z'), utc('2026-01-15T10:00:00Z')), []);
  assert.deepEqual(splitSessionByDay(utc('2026-01-15T12:00:00Z'), utc('2026-01-15T10:00:00Z')), []);
});

test('toParisDayYMD bascule de jour à minuit heure de Paris', () => {
  assert.equal(toParisDayYMD(utc('2026-01-15T22:59:59Z')), '2026-01-15');
  assert.equal(toParisDayYMD(utc('2026-01-15T23:00:00Z')), '2026-01-16');
});
