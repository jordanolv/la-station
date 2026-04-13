import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

cloudinary.config({
  cloud_name: '',
  api_key: '',
  api_secret: '',
});

const MOUNTAINS_PATH = path.join(__dirname, '../src/features/peak-hunters/data/mountains.json');
const mountains = JSON.parse(fs.readFileSync(MOUNTAINS_PATH, 'utf-8'));

function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadMountain(mountain, index, total, retries = 3) {
  if (mountain.image?.includes('cloudinary.com')) {
    console.log(`[${index}/${total}] ✓ skip  ${mountain.mountainLabel}`);
    return mountain.image;
  }

  const publicId = `the-ridge/mountains/${slugify(mountain.mountainLabel)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(mountain.image, {
        public_id: publicId,
        overwrite: false,
        transformation: [{ width: 800, height: 450, crop: 'fill' }],
      });
      console.log(`[${index}/${total}] ✅ ok    ${mountain.mountainLabel}`);
      return result.secure_url;
    } catch (err) {
      if (err.error?.http_code === 400 && err.error?.message?.includes('already exists')) {
        const url = `https://res.cloudinary.com/theridge-bot/image/upload/c_fill,w_800,h_450/${publicId}`;
        console.log(`[${index}/${total}] ✓ exist  ${mountain.mountainLabel}`);
        return url;
      }
      const is429 = err.message?.includes('429') || err.error?.http_code === 429;
      if (is429 && attempt < retries) {
        const wait = 3000 * attempt;
        console.warn(`[${index}/${total}] ⏳ 429 retry ${attempt}/${retries} dans ${wait/1000}s — ${mountain.mountainLabel}`);
        await sleep(wait);
        continue;
      }
      console.error(`[${index}/${total}] ❌ fail  ${mountain.mountainLabel} — ${err.message ?? err}`);
      return mountain.image;
    }
  }
}

async function run() {
  console.log(`Upload de ${mountains.length} montagnes...\n`);
  let updated = 0;

  for (let i = 0; i < mountains.length; i++) {
    const mountain = mountains[i];
    const newUrl = await uploadMountain(mountain, i + 1, mountains.length);
    if (newUrl !== mountain.image) {
      mountain.image = newUrl;
      updated++;
    }
    await sleep(800);
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(MOUNTAINS_PATH, JSON.stringify(mountains, null, 2));
    }
  }

  fs.writeFileSync(MOUNTAINS_PATH, JSON.stringify(mountains, null, 2));
  console.log(`\nTerminé. ${updated} images mises à jour.`);
}

run().catch(console.error);
