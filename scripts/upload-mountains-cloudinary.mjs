/**
 * Upload toutes les images mountains.json vers Cloudinary
 * et met à jour les URLs dans le fichier.
 * Usage: node scripts/upload-mountains-cloudinary.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLOUD_NAME = 'theridge-bot';
const API_KEY = '887536281162126';
const API_SECRET = 'QT_nf7oPUs4YCKaZ0TbGnQlH4Wg';
const FOLDER = 'mountains';

const filePath = join(__dirname, '../src/features/mountain/data/mountains.json');
const mountains = JSON.parse(readFileSync(filePath, 'utf-8'));

function sign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const str = sorted + API_SECRET;
  return createHash('sha256').update(str).digest('hex');
}

async function downloadImage(url, attempt = 1) {
  if (attempt > 1) await new Promise(r => setTimeout(r, 2000 * attempt));
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
    redirect: 'follow',
  });
  if (res.status === 429 && attempt <= 4) {
    return downloadImage(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function uploadImage(mountain) {
  // Vérifier si déjà uploadé
  if (mountain.image.includes('cloudinary.com')) {
    return mountain.image;
  }

  // Télécharger l'image en local d'abord
  const imageBuffer = await downloadImage(mountain.image);

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: FOLDER, public_id: mountain.id, timestamp };
  const signature = sign(params);

  // Convertir en base64 pour l'upload
  const base64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  const form = new FormData();
  form.append('file', base64);
  form.append('folder', FOLDER);
  form.append('public_id', mountain.id);
  form.append('timestamp', timestamp.toString());
  form.append('api_key', API_KEY);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function main() {
  console.log(`Upload de ${mountains.length} images vers Cloudinary...`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < mountains.length; i++) {
    const m = mountains[i];
    process.stdout.write(`[${i + 1}/${mountains.length}] ${m.name.substring(0, 40)}... `);

    try {
      const newUrl = await uploadImage(m);
      if (newUrl !== m.image) {
        mountains[i].image = newUrl;
        uploaded++;
        process.stdout.write(`✅\n`);
      } else {
        skipped++;
        process.stdout.write(`— déjà uploadé\n`);
      }
    } catch (e) {
      errors++;
      process.stdout.write(`❌ ${e.message.substring(0, 60)}\n`);
    }

    // Sauvegarder tous les 10 pour ne pas perdre les progrès
    if ((i + 1) % 10 === 0) {
      writeFileSync(filePath, JSON.stringify(mountains, null, 2), 'utf-8');
    }

    // Délai pour éviter le rate-limiting Wikipedia/Cloudinary
    await new Promise(r => setTimeout(r, 800));
  }

  writeFileSync(filePath, JSON.stringify(mountains, null, 2), 'utf-8');
  console.log(`\n✅ Terminé — ${uploaded} uploadées, ${skipped} ignorées, ${errors} erreurs`);
}

main().catch(console.error);
