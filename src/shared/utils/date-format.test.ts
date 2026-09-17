import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime } from './date-format';

test('formatTime affiche les unités non nulles seulement', () => {
  assert.equal(formatTime(0), '0s');
  assert.equal(formatTime(59), '59s');
  assert.equal(formatTime(60), '1m');
  assert.equal(formatTime(3600), '1h');
  assert.equal(formatTime(3661), '1h 1m 1s');
});

test('formatTime saute les minutes quand elles valent zéro', () => {
  assert.equal(formatTime(3659), '1h 59s');
});

test('formatTime tient sur de longues durées de vocal', () => {
  assert.equal(formatTime(100 * 3600 + 30 * 60), '100h 30m');
});
