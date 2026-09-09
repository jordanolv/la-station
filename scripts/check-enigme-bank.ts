import assert from 'node:assert';
import { EnigmeBankService, normalizeAnswer } from '../src/features/arcade/enigme/services/enigme-bank.service';
import bank from '../src/features/arcade/enigme/data/enigmes.json';

assert.strictEqual(normalizeAnswer("  L'Éléphant, dans un Magasin !"), 'lelephantdansunmagasin');
assert.strictEqual(normalizeAnswer('Là-Haut'), 'lahaut');

for (const r of bank as any[]) {
  assert.ok(['devinette', 'charade', 'emoji'].includes(r.type), r.question);
  assert.ok(r.answers.length > 0 && r.hint, r.question);
  assert.ok(EnigmeBankService.isCorrect(r, r.answers[0].toUpperCase() + ' '), r.question);
}

const seen = new Set<string>();
for (let i = 0; i < 500; i++) {
  const r = EnigmeBankService.pickRiddle();
  seen.add(r.type);
  assert.ok(r.question && r.hint && r.answers.length > 0, JSON.stringify(r));
  if (r.type === 'suite' || r.type === 'calcul') assert.ok(Number.isInteger(Number(r.answers[0])), JSON.stringify(r));
  if (r.type === 'anagramme') {
    const shown = r.question.split('## ')[1].replace(/ /g, '');
    assert.notStrictEqual(shown, r.answers[0]);
    assert.strictEqual(shown.split('').sort().join(''), r.answers[0].split('').sort().join(''));
  }
  assert.ok(EnigmeBankService.isCorrect(r, r.answers[0]));
  assert.ok(!EnigmeBankService.isCorrect(r, 'zzzz-pas-la-reponse'));
}
assert.strictEqual(seen.size, 6, [...seen].join(','));
console.log('ok', (bank as any[]).length, 'énigmes en banque');
console.log(EnigmeBankService.pickRiddle());
