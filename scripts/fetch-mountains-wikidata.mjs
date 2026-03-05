/**
 * Fetch ~300 montagnes depuis Wikidata avec images Wikimedia officielles
 * Répartition par tranches d'altitude pour une bonne distribution de raretés
 * Usage: node scripts/fetch-mountains-wikidata.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPARQL = 'https://query.wikidata.org/sparql';

// Tranches calées sur les seuils de rareté : common <4100, rare 4100-6500, epic 6500-8091, legendary ≥8091
// Objectif : ~180 common, ~75 rare, ~30 epic, ~15 legendary
// La tranche common est découpée pour éviter les timeouts Wikidata
const TRANCHES = [
  { min: 0,    max: 1000, limit: 60  },
  { min: 1000, max: 2000, limit: 60  },
  { min: 2000, max: 3000, limit: 60  },
  { min: 3000, max: 4100, limit: 60  },
  { min: 4100, max: 6500, limit: 100 },
  { min: 6500, max: 8091, limit: 40  },
  { min: 8091, max: 9999, limit: 20  },
];

function sparqlQuery(min, max, limit) {
  return `
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
LIMIT ${limit}
`;
}

async function fetchTranche(min, max, limit, attempt = 1) {
  const url = `${SPARQL}?query=${encodeURIComponent(sparqlQuery(min, max, limit))}&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'MountainBot/1.0 (discord bot)',
      },
    });
    if (!res.ok) {
      if ((res.status === 504 || res.status === 429) && attempt <= 3) {
        console.log(`  ⚠️  ${res.status}, retry ${attempt}/3...`);
        await new Promise(r => setTimeout(r, 3000 * attempt));
        return fetchTranche(min, max, limit, attempt + 1);
      }
      throw new Error(`Wikidata ${res.status} pour tranche ${min}-${max}`);
    }
    const data = await res.json();
    return data.results.bindings;
  } catch (e) {
    if (attempt <= 3 && e.cause) {
      console.log(`  ⚠️  Erreur réseau, retry ${attempt}/3...`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
      return fetchTranche(min, max, limit, attempt + 1);
    }
    throw e;
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function resolveImageUrl(redirectUrl) {
  try {
    const res = await fetch(redirectUrl, { redirect: 'follow' });
    return res.url; // URL finale après redirection
  } catch {
    return redirectUrl;
  }
}

async function fetchDescriptions(batch) {
  const titles = batch
    .map(m => decodeURIComponent(m.wiki.split('/wiki/').pop() ?? ''))
    .filter(Boolean)
    .join('|');
  if (!titles) return;

  const url = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=extracts&exintro=1&explaintext=1&exsentences=2&format=json&origin=*`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MountainBot/1.0' } });
  const data = await res.json();
  const pages = data?.query?.pages ?? {};

  for (const page of Object.values(pages)) {
    if (!page.extract) continue;
    const title = page.title;
    const mtn = batch.find(m => decodeURIComponent(m.wiki.split('/wiki/').pop() ?? '') === title);
    if (mtn) {
      mtn.description = page.extract.split('\n')[0].substring(0, 220).trim();
    }
  }
}

async function main() {
  const seen = new Set();
  const mountains = [];

  for (const { min, max, limit } of TRANCHES) {
    console.log(`Tranche ${min}–${max}m (max ${limit})...`);
    const bindings = await fetchTranche(min, max, limit);
    console.log(`  → ${bindings.length} résultats`);

    for (const b of bindings) {
      const name = b.itemLabel?.value;
      const altRaw = b.altitude?.value;
      const imageRaw = b.image?.value ?? '';
      const wikiUrl = b.article?.value ?? '';

      if (!name || !altRaw || !imageRaw || seen.has(name)) continue;
      seen.add(name);

      const altitude = Math.round(parseFloat(altRaw));
      const filename = decodeURIComponent(imageRaw.split('/').pop() ?? '');
      const image = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(filename)}&width=600`;

      mountains.push({
        id: slugify(name),
        name,
        description: '',
        altitude: `${altitude.toLocaleString('fr-FR')} m`,
        image,
        wiki: wikiUrl,
      });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n${mountains.length} montagnes uniques — récupération des descriptions...`);

  const BATCH = 20;
  for (let i = 0; i < mountains.length; i += BATCH) {
    await fetchDescriptions(mountains.slice(i, i + BATCH));
    process.stdout.write(`  ${Math.min(i + BATCH, mountains.length)}/${mountains.length}\r`);
    await new Promise(r => setTimeout(r, 300));
  }

  for (const m of mountains) {
    if (!m.description) m.description = `Sommet culminant à ${m.altitude}.`;
  }

  // Résoudre les redirects des URLs d'images (Discord ne suit pas les 301 dans MediaGallery)
  console.log('Résolution des URLs d\'images...');
  const IMG_BATCH = 20;
  for (let i = 0; i < mountains.length; i += IMG_BATCH) {
    const batch = mountains.slice(i, i + IMG_BATCH);
    await Promise.all(batch.map(async (m) => {
      m.image = await resolveImageUrl(m.image);
    }));
    process.stdout.write(`  ${Math.min(i + IMG_BATCH, mountains.length)}/${mountains.length}\r`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('');

  // Mélanger aléatoirement pour que toutes les raretés soient représentées
  for (let i = mountains.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mountains[i], mountains[j]] = [mountains[j], mountains[i]];
  }
  const final = mountains.slice(0, 300);

  const outPath = join(__dirname, '../src/features/mountain/data/mountains.json');
  writeFileSync(outPath, JSON.stringify(final, null, 2), 'utf-8');
  console.log(`\n✅ ${final.length} montagnes sauvegardées`);

  const getRarity = (alt) => {
    const n = parseInt(alt.replace(/[\s\u00a0]/g, ''));
    if (n >= 8091) return 'legendary';
    if (n >= 6500) return 'epic';
    if (n >= 4100) return 'rare';
    return 'common';
  };
  const stats = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const m of final) stats[getRarity(m.altitude)]++;
  console.log('Distribution:', stats);
  console.log('Exemple image:', final[0]?.image);
}

main().catch(console.error);
