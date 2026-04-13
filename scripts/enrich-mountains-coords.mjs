/**
 * Enrichit mountains.json avec les coordonnées GPS (lat/lng) via Wikidata.
 *
 * Stratégie :
 *   1. Extrait le titre Wikipedia FR depuis le champ `article`
 *   2. Résout le QID Wikidata correspondant via l'API Wikipedia
 *   3. Récupère les coordonnées (P625) via l'API Wikidata
 *   4. Écrit le JSON enrichi (in-place)
 *
 * Usage : node scripts/enrich-mountains-coords.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/features/peak-hunters/data/mountains.json');

const DELAY_MS = 150; // délai entre requêtes pour ne pas spam Wikidata
const BATCH_SIZE = 50; // taille des batches pour l'API Wikidata

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Extrait le titre Wikipedia depuis l'URL FR */
function extractWikiTitle(articleUrl) {
  const url = new URL(articleUrl);
  return decodeURIComponent(url.pathname.replace('/wiki/', ''));
}

/** Résout les QIDs Wikidata à partir de titres Wikipedia FR (batch).
 *  Gère normalisation (underscores→espaces) et redirections. */
async function resolveQids(titles) {
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    redirects: '1',
    format: 'json',
    formatversion: '2',
  });

  const res = await fetch(`https://fr.wikipedia.org/w/api.php?${params}`);
  const data = await res.json();
  const query = data.query ?? {};

  // Construit une map "titre envoyé → titre final après normalisation + redirect"
  const canonical = {};
  for (const n of query.normalized ?? []) canonical[n.from] = n.to;
  for (const r of query.redirects ?? []) {
    // La source peut être déjà normalisée
    const from = r.from;
    canonical[from] = r.to;
    // Propage aussi depuis le titre original si on a une chaîne
    for (const [orig, norm] of Object.entries(canonical)) {
      if (norm === from) canonical[orig] = r.to;
    }
  }

  // title final → QID
  const titleToQid = {};
  for (const page of query.pages ?? []) {
    const qid = page.pageprops?.wikibase_item;
    if (qid) titleToQid[page.title] = qid;
  }

  // Résoud chaque titre d'entrée vers son QID
  const result = {};
  for (const title of titles) {
    const finalTitle = canonical[title] ?? title;
    const qid = titleToQid[finalTitle];
    if (qid) result[title] = qid;
  }
  return result;
}

/** Récupère les coordonnées P625 pour un batch de QIDs */
async function fetchCoords(qids) {
  const sparql = `
    SELECT ?item ?lat ?lng WHERE {
      VALUES ?item { ${qids.map(q => `wd:${q}`).join(' ')} }
      ?item wdt:P625 ?coords .
      BIND(geof:latitude(?coords) AS ?lat)
      BIND(geof:longitude(?coords) AS ?lng)
    }
  `;

  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'la-station-bot/1.0 (mountain-coords-enrichment)',
    },
    body: new URLSearchParams({ query: sparql }),
  });

  const data = await res.json();
  const result = {};
  for (const row of data.results?.bindings ?? []) {
    const qid = row.item.value.replace('http://www.wikidata.org/entity/', '');
    result[qid] = {
      lat: parseFloat(row.lat.value),
      lng: parseFloat(row.lng.value),
    };
  }
  return result;
}

async function main() {
  const mountains = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  const toEnrich = mountains.filter(m => m.lat == null || m.lng == null);
  console.log(`${mountains.length} montagnes au total, ${toEnrich.length} à enrichir.`);

  if (toEnrich.length === 0) {
    console.log('Tout est déjà enrichi !');
    return;
  }

  // Étape 1 : titre → QID (batches de 50, limite Wikipedia)
  const titleToQid = {};
  const titleToMountain = {};
  for (const m of toEnrich) {
    const title = extractWikiTitle(m.article);
    titleToMountain[title] = m;
  }

  const titles = Object.keys(titleToMountain);
  console.log(`\nRésolution des QIDs (${titles.length} titres)...`);

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const resolved = await resolveQids(batch);
    Object.assign(titleToQid, resolved);
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, titles.length)}/${titles.length}\r`);
    await sleep(DELAY_MS);
  }
  console.log(`\n  ${Object.keys(titleToQid).length} QIDs résolus.`);

  // Étape 2 : QID → coordonnées (batches de 50, SPARQL)
  const qidToCoords = {};
  const allQids = Object.values(titleToQid);
  console.log(`\nRécupération des coordonnées (${allQids.length} QIDs)...`);

  for (let i = 0; i < allQids.length; i += BATCH_SIZE) {
    const batch = allQids.slice(i, i + BATCH_SIZE);
    const coords = await fetchCoords(batch);
    Object.assign(qidToCoords, coords);
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allQids.length)}/${allQids.length}\r`);
    await sleep(DELAY_MS);
  }
  console.log(`\n  ${Object.keys(qidToCoords).length} coordonnées trouvées.`);

  // Étape 3 : injection dans les données
  let enriched = 0;
  let missing = [];

  for (const m of mountains) {
    if (m.lat != null && m.lng != null) continue;

    const title = extractWikiTitle(m.article);
    const qid = titleToQid[title];
    if (!qid) { missing.push(`${m.mountainLabel} (QID introuvable)`); continue; }

    const coords = qidToCoords[qid];
    if (!coords) { missing.push(`${m.mountainLabel} (coordonnées introuvables, QID: ${qid})`); continue; }

    m.lat = coords.lat;
    m.lng = coords.lng;
    enriched++;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(mountains, null, 2), 'utf-8');
  console.log(`\n✅ ${enriched} montagnes enrichies, fichier mis à jour.`);

  if (missing.length > 0) {
    console.log(`\n⚠️  ${missing.length} montagne(s) sans coordonnées :`);
    missing.forEach(m => console.log(`   - ${m}`));
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
