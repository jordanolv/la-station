import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer } from './enigme-bank.service';

test('la comparaison ignore casse, accents, ponctuation et espaces', () => {
  assert.equal(normalizeAnswer('Éléphant'), 'elephant');
  assert.equal(normalizeAnswer('LE  MONT-BLANC !'), 'lemontblanc');
  assert.equal(normalizeAnswer("l'île"), 'lile');
  assert.equal(normalizeAnswer('  ça  '), 'ca');
});

test('les chiffres sont conservés', () => {
  assert.equal(normalizeAnswer('42 ans'), '42ans');
});

test('les ligatures françaises valent leur forme décomposée', () => {
  // Sans ça, un joueur qui tape "cœur" ne matche pas la réponse "coeur".
  assert.equal(normalizeAnswer('cœur'), normalizeAnswer('coeur'));
  assert.equal(normalizeAnswer('Œuf'), normalizeAnswer('oeuf'));
  assert.equal(normalizeAnswer('nævus'), normalizeAnswer('naevus'));
});

test('une réponse sans aucun caractère exploitable donne une chaîne vide', () => {
  assert.equal(normalizeAnswer('???'), '');
  assert.equal(normalizeAnswer('   '), '');
});
