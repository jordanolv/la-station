#!/usr/bin/env node
/**
 * Redénomination ÷10 des soldes — voir economy.md §8.
 * Opération unique. Dry-run par défaut ; `--apply` pour écrire.
 *
 *   node scripts/redenominate.mjs
 *   node scripts/redenominate.mjs --apply
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const FACTOR = 10;
const MIGRATION_ID = 'redenominate-v1';
const apply = process.argv.includes('--apply');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI absent de l environnement.');
  process.exit(1);
}

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const pct = (arr, q) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0);

const summarise = (balances) => {
  const sorted = [...balances].sort((a, b) => a - b);
  return {
    masse: sorted.reduce((s, v) => s + v, 0),
    mediane: pct(sorted, 0.5),
    p90: pct(sorted, 0.9),
    max: sorted[sorted.length - 1] ?? 0,
  };
};

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();

  const already = await db.collection('migrations').findOne({ _id: MIGRATION_ID });
  if (already) {
    console.error(`Migration déjà appliquée le ${already.appliedAt.toISOString()} — rien à faire.`);
    console.error('Supprimer le marqueur à la main pour forcer un rejeu.');
    process.exit(1);
  }

  const users = await db.collection('users').find({}, { projection: { 'profil.money': 1 } }).toArray();
  const before = users.map((u) => u?.profil?.money ?? 0);
  const after = before.map((v) => Math.round(v / FACTOR));

  const a = summarise(before);
  const b = summarise(after);

  console.log(`${users.length} comptes · facteur ÷${FACTOR}\n`);
  console.log(''.padEnd(10) + 'avant'.padStart(14) + 'apres'.padStart(14));
  for (const [label, key] of [['masse', 'masse'], ['mediane', 'mediane'], ['p90', 'p90'], ['max', 'max']]) {
    console.log(label.padEnd(10) + fmt(a[key]).padStart(14) + fmt(b[key]).padStart(14));
  }

  if (!apply) {
    console.log('\nDry-run — rien n a été écrit. Relancer avec --apply pour exécuter.');
    process.exit(0);
  }

  const res = await db.collection('users').updateMany({}, [
    { $set: { 'profil.money': { $round: [{ $divide: ['$profil.money', FACTOR] }, 0] } } },
  ]);
  await db.collection('migrations').insertOne({
    _id: MIGRATION_ID,
    appliedAt: new Date(),
    factor: FACTOR,
    matched: res.matchedCount,
    modified: res.modifiedCount,
  });

  console.log(`\n${res.modifiedCount} soldes redénominés. Marqueur « ${MIGRATION_ID} » posé.`);
} finally {
  await client.close();
}
