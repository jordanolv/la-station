/**
 * Migration : renommage des champs de tickets en champs d'expéditions
 *
 * packTickets     → sentierTickets
 * premiumTickets  → falaiseTickets
 * epicTickets     → sommetTickets
 *
 * Usage : node scripts/migrate-expedition-fields.mjs
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI manquant dans .env');
  process.exit(1);
}

const client = new MongoClient(uri);

async function migrate() {
  await client.connect();
  const db = client.db();
  const collection = db.collection('user_mountains');

  const result = await collection.updateMany(
    {},
    {
      $rename: {
        packTickets:    'sentierTickets',
        premiumTickets: 'falaiseTickets',
        epicTickets:    'sommetTickets',
      },
    },
  );

  console.log(`✅ Migration terminée — ${result.modifiedCount} documents mis à jour`);
  await client.close();
}

migrate().catch(err => {
  console.error('❌ Erreur migration :', err);
  client.close();
  process.exit(1);
});
