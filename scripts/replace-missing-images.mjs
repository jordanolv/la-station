/**
 * Remplace les montagnes sans image Cloudinary par de nouvelles depuis Wikidata
 * Usage: node scripts/replace-missing-images.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../src/features/mountain/data/mountains.json');

const CLOUD_NAME = 'theridge-bot';
const API_KEY = '887536281162126';
const API_SECRET = 'QT_nf7oPUs4YCKaZ0TbGnQlH4Wg';
const FOLDER = 'mountains';
const SPARQL = 'https://query.wikidata.org/sparql';

function sign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return createHash('sha256').update(sorted + API_SECRET).digest('hex');
}

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function fetchCandidates(excludeNames, limit = 80) {
  // Fetch depuis plusieurs tranches pour avoir assez de candidats
  const tranches = [
    { min: 0, max: 2000, limit: 30 },
    { min: 2000, max: 4100, limit: 30 },
    { min: 4100, max: 9999, limit: 30 },
  ];

  const results = [];
  for (const { min, max, limit: l } of tranches) {
    const query = `
SELECT DISTINCT ?item ?itemLabel ?altitude ?image ?article WHERE {
  ?item wdt:P31/wdt:P279* wd:Q8502 .
  ?item wdt:P2044 ?altitude .
  ?item wdt:P18 ?image .
  ?article schema:about ?item .
  ?article schema:isPartOf <https://fr.wikipedia.org/> .
  FILTER(?altitude >= ${min} && ?altitude < ${max})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY DESC(?altitude)
LIMIT ${l * 3}
`;
    const url = `${SPARQL}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': 'MountainBot/1.0' },
    });
    if (!res.ok) { console.log(`  ⚠️ Wikidata ${res.status} pour tranche ${min}-${max}`); continue; }
    const data = await res.json();
    results.push(...data.results.bindings);
    await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}

async function downloadImage(url, attempt = 1) {
  if (attempt > 1) await new Promise(r => setTimeout(r, 2000 * attempt));
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
    redirect: 'follow',
  });
  if (res.status === 429 && attempt <= 4) return downloadImage(url, attempt + 1);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToCloudinary(id, imageUrl) {
  const buffer = await downloadImage(imageUrl);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: FOLDER, public_id: id, timestamp };
  const signature = sign(params);
  const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  const form = new FormData();
  form.append('file', base64);
  form.append('folder', FOLDER);
  form.append('public_id', id);
  form.append('timestamp', timestamp.toString());
  form.append('api_key', API_KEY);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  return (await res.json()).secure_url;
}

async function resolveImageUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return res.url;
  } catch { return url; }
}

async function main() {
  const mountains = JSON.parse(readFileSync(filePath, 'utf-8'));
  const toRemove = mountains.filter(m => !m.image.includes('cloudinary.com'));
  console.log(`${toRemove.length} montagnes à remplacer: ${toRemove.map(m => m.name).join(', ')}\n`);

  // Retirer les mauvaises
  const existingNames = new Set(mountains.map(m => m.name));
  const kept = mountains.filter(m => m.image.includes('cloudinary.com'));

  // Fetch candidats depuis Wikidata
  console.log('Récupération de candidats depuis Wikidata...');
  const bindings = await fetchCandidates(existingNames);
  console.log(`${bindings.length} candidats récupérés\n`);

  const needed = toRemove.length;
  const replacements = [];

  for (const b of bindings) {
    if (replacements.length >= needed) break;

    const name = b.itemLabel?.value;
    const altRaw = b.altitude?.value;
    const imageRaw = b.image?.value ?? '';

    if (!name || !altRaw || !imageRaw) continue;
    if (existingNames.has(name)) continue;
    existingNames.add(name);

    const altitude = Math.round(parseFloat(altRaw));
    const filename = decodeURIComponent(imageRaw.split('/').pop() ?? '');
    const rawImageUrl = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(filename)}&width=600`;

    const id = slugify(name);
    process.stdout.write(`[${replacements.length + 1}/${needed}] ${name.substring(0, 40)}... `);

    try {
      const resolvedUrl = await resolveImageUrl(rawImageUrl);
      const cloudUrl = await uploadToCloudinary(id, resolvedUrl);
      replacements.push({
        id,
        name,
        description: `Sommet culminant à ${altitude.toLocaleString('fr-FR')} m.`,
        altitude: `${altitude.toLocaleString('fr-FR')} m`,
        image: cloudUrl,
        wiki: b.article?.value ?? '',
      });
      process.stdout.write(`✅\n`);
    } catch (e) {
      process.stdout.write(`❌ ${e.message.substring(0, 60)}\n`);
      existingNames.delete(name); // libérer pour réessayer avec un autre
    }

    await new Promise(r => setTimeout(r, 800));
  }

  if (replacements.length < needed) {
    console.log(`\n⚠️  Seulement ${replacements.length}/${needed} remplacements trouvés`);
  }

  const final = [...kept, ...replacements];
  writeFileSync(filePath, JSON.stringify(final, null, 2), 'utf-8');
  console.log(`\n✅ mountains.json mis à jour: ${final.length} montagnes (${replacements.length} remplacées)`);
}

main().catch(console.error);
