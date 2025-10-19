// Service pour générer des images à partir de PSD avec des calques dynamiques
// npm i ag-psd sharp
import { readPsd, Psd, Layer } from "ag-psd";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";

type Replacements = Record<string, string>; // ex: { USERNAME: "Jordan", HOURS: "12.3 h" }

export type LayerPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
};

function isTextLayer(l: any): boolean {
  return !!l?.text; // ag-psd: calque texte => propriété .text
}

function getAllLayers(layerOrPsd: any): Layer[] {
  const out: Layer[] = [];
  const walk = (node: any) => {
    if (node && typeof node === "object") {
      if (node !== layerOrPsd) {
        out.push(node);
      }
      if (node.children) node.children.forEach(walk);
    }
  };
  // psd.children = top-level layers
  if ((layerOrPsd as Psd).children) (layerOrPsd as Psd).children.forEach(walk);
  else walk(layerOrPsd);
  return out;
}

// Convertit couleur PSD (0..1) vers hex CSS
function rgbToHex(rgb?: { r?: number; g?: number; b?: number }) {
  const c = (v?: number) =>
    Math.max(0, Math.min(255, Math.round((v ?? 1) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(rgb?.r)}${c(rgb?.g)}${c(rgb?.b)}`;
}

function makeCanvasText(
  text: string,
  w: number,
  h: number,
  opts: {
    fontFamily?: string;
    fontSize?: number; // px
    fill?: string; // hex
    justify?: "left" | "center" | "right";
    fontWeight?: number | string;
  }
): Buffer {
  const {
    fontFamily = "HelveticaNeueLTStd-Bd",
    fontSize = 32,
    fill = "#FFFFFF", // Blanc par défaut
    justify = "left",
    fontWeight = 700,
  } = opts;

  // Créer un canvas avec les dimensions du calque
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  // Fond transparent
  ctx.clearRect(0, 0, w, h);

  // Configuration du texte
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.fillStyle = fill;
  ctx.textBaseline = "top"; // Aligner en haut

  // Alignement horizontal
  let x = 0;
  if (justify === "center") {
    ctx.textAlign = "center";
    x = w / 2;
  } else if (justify === "right") {
    ctx.textAlign = "right";
    x = w;
  } else {
    ctx.textAlign = "left";
    x = 0;
  }

  // Position verticale avec un petit padding pour éviter les coupures en haut
  // On ajoute environ 10% de la taille de police comme padding
  const paddingTop = Math.max(2, fontSize * 0.1);
  const y = paddingTop;

  // Dessiner le texte
  ctx.fillText(text, x, y);

  // Retourner le buffer PNG
  return canvas.toBuffer("image/png");
}

export async function renderFromPsd({
  psdPath,
  backgroundPng, // exporte un PNG de fond (sans tes calques dynamiques) pour un rendu parfait
  outPath,
  replacements,
}: {
  psdPath: string;
  backgroundPng: string;
  outPath: string;
  replacements: Replacements;
}) {
  const psdBuf = fs.readFileSync(psdPath);
  const psd = readPsd(psdBuf);

  // Taille finale de l'image
  const width = psd.width!;
  const height = psd.height!;

  // Base = image de fond (exportée depuis Photoshop)
  const base = sharp(backgroundPng).resize(width, height);

  // Parcours des calques texte nommés {{KEY}}
  const layers = getAllLayers(psd);
  const composites: sharp.OverlayOptions[] = [];

  for (const l of layers) {
    if (!isTextLayer(l)) continue;
    const m = /^{{\s*([A-Z0-9_]+)\s*}}$/.exec(l.name ?? "");
    if (!m) continue;

    const key = m[1]; // ex: USERNAME
    const value = replacements[key];
    if (value == null) continue; // pas de remplacement fourni -> on ignore

    const left = l.left ?? 0;
    const top = l.top ?? 0;
    const right = l.right ?? left;
    const bottom = l.bottom ?? top;
    const lw = Math.max(0, right - left);
    const lh = Math.max(0, bottom - top);

    // Style principal depuis le run 0 s'il existe
    const run0 = l.text?.styleRuns?.[0]?.style ?? {};
    const fontSize = run0.fontSize ? Math.round(run0.fontSize) : 48;
    const fontFamily = (run0.font as any)?.name || (l.text as any)?.font?.name || "Inter";
    const fillColor = run0.fillColor as any;
    const fill = rgbToHex(fillColor || { r: 0, g: 0, b: 0 }); // Noir par défaut au lieu de blanc

    // Justification
    const justRaw =
      (l.text?.paragraphStyle as any)?.justify ||
      (run0 as any).justification ||
      "left";
    const justify =
      /center/i.test(String(justRaw)) ? "center" : /right/i.test(String(justRaw)) ? "right" : "left";

    const textBuffer = makeCanvasText(value, lw || width, lh || fontSize * 1.5, {
      fontFamily,
      fontSize,
      fill,
      justify: justify as "left" | "center" | "right",
      fontWeight: 700,
    });

    composites.push({ input: textBuffer, left, top });
  }

  const out = await base.composite(composites).png().toBuffer();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  
  return out;
}

// Version qui retourne un buffer sans sauvegarder le fichier
export async function renderFromPsdToBuffer({
  psdPath,
  backgroundPng,
  replacements,
}: {
  psdPath: string;
  backgroundPng: string;
  replacements: Replacements;
}): Promise<Buffer> {
  const psdBuf = fs.readFileSync(psdPath);

  console.log(`[PSD Render] PSD file size: ${psdBuf.length} bytes`);

  // Essayer de lire avec skipLayerImageData: true (c'était la config qui marchait)
  const psd = readPsd(psdBuf, {
    skipLayerImageData: true,
    skipCompositeImageData: false,
    skipThumbnail: true,
  });

  console.log(`[PSD Render] PSD dimensions: ${psd.width}x${psd.height}`);
  console.log(`[PSD Render] PSD has ${psd.children?.length || 0} top-level children`);
  console.log(`[PSD Render] PSD object keys:`, Object.keys(psd));

  // Taille finale de l'image
  const width = psd.width!;
  const height = psd.height!;

  // Base = image de fond (exportée depuis Photoshop)
  const base = sharp(backgroundPng).resize(width, height);

  // Parcours des calques texte nommés {{KEY}}
  const layers = getAllLayers(psd);
  const composites: sharp.OverlayOptions[] = [];

  console.log(`[PSD Render] Found ${layers.length} layers total (including nested)`);

  // Debug: afficher tous les noms de calques
  layers.forEach((l, i) => {
    console.log(`[PSD Render]   Layer ${i}: "${l.name}" (text: ${!!l.text})`);
  });

  for (const l of layers) {
    if (!isTextLayer(l)) continue;

    console.log(`[PSD Render] Checking layer: ${l.name}`);

    const m = /^{{\s*([A-Z0-9_]+)\s*}}$/.exec(l.name ?? "");
    if (!m) continue;

    const key = m[1]; // ex: USERNAME
    const value = replacements[key];

    console.log(`[PSD Render] Found dynamic layer {{${key}}} -> "${value}"`);
    console.log(`[PSD Render] Layer bounds: left=${l.left}, top=${l.top}, right=${l.right}, bottom=${l.bottom}`);

    if (value == null) continue; // pas de remplacement fourni -> on ignore

    const left = l.left ?? 0;
    const top = l.top ?? 0;
    const right = l.right ?? left;
    const bottom = l.bottom ?? top;
    const lw = Math.max(0, right - left);
    const lh = Math.max(0, bottom - top);

    // Style principal depuis le run 0 s'il existe
    const run0 = l.text?.styleRuns?.[0]?.style ?? {};

    // Debug: afficher tout le contenu de run0 pour comprendre pourquoi les styles ne sont pas lus
    console.log(`[PSD Render] run0 style:`, JSON.stringify(run0, null, 2));

    // HARDCODED STYLES (car ag-psd ne lit pas les styles correctement)
    // Essayer de déduire la taille de police depuis la hauteur du calque
    // Utiliser directement la hauteur du calque comme taille de police (ou légèrement plus)
    const estimatedFontSize = lh > 0 ? Math.round(lh * 1.1) : 32;
    const fontSize = run0.fontSize ? Math.round(run0.fontSize) : estimatedFontSize;
    const fontFamily = (run0.font as any)?.name || (l.text as any)?.font?.name || "HelveticaNeueLTStd-Bd";
    const fillColor = run0.fillColor as any;
    const fill = rgbToHex(fillColor || { r: 1, g: 1, b: 1 }); // BLANC par défaut (tes textes sont blancs)

    // Justification
    const justRaw =
      (l.text?.paragraphStyle as any)?.justify ||
      (run0 as any).justification ||
      "left";
    let justify =
      /center/i.test(String(justRaw)) ? "center" : /right/i.test(String(justRaw)) ? "right" : "left";

    // Forcer l'alignement center pour USERNAME
    if (key === 'USERNAME') {
      justify = 'center';
    }

    console.log(`[PSD Render] Rendering "${value}" at (${left}, ${top}) with font ${fontFamily} ${fontSize}px`);
    console.log(`[PSD Render] Original layer size: ${lw}x${lh}`);
    console.log(`[PSD Render] Text color: ${fill}, justify: ${justify}`);

    // Calculer une largeur suffisante pour le texte
    // Estimation: chaque caractère fait environ 0.6 * fontSize en largeur
    const estimatedWidth = value.length * fontSize * 0.6;
    const canvasWidth = Math.max(lw, estimatedWidth, 100); // Au moins 100px

    // Utiliser une hauteur généreuse pour éviter les coupures (au moins 1.8x la taille de police)
    const canvasHeight = Math.max(lh, fontSize * 1.8);

    console.log(`[PSD Render] Canvas size for text: ${canvasWidth}x${canvasHeight}`);

    const textBuffer = makeCanvasText(value, canvasWidth, canvasHeight, {
      fontFamily,
      fontSize,
      fill,
      justify: justify as "left" | "center" | "right",
      fontWeight: 700,
    });

    composites.push({ input: textBuffer, left, top });
  }

  console.log(`[PSD Render] Compositing ${composites.length} text overlays`);

  const out = await base.composite(composites).png().toBuffer();
  
  return out;
}

/**
 * Extrait les positions des calques de référence depuis un PSD
 * Les calques de référence doivent être nommés [NOM_DU_CALQUE]
 * Ex: [AVATAR], [VOICE_CHART], [ROLE_BADGES]
 */
export async function extractReferenceLayersFromPsd(
  psdPath: string
): Promise<Record<string, LayerPosition>> {
  const psdBuf = fs.readFileSync(psdPath);
  const psd = readPsd(psdBuf, {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });

  const layers = getAllLayers(psd);
  const positions: Record<string, LayerPosition> = {};

  for (const l of layers) {
    // Chercher les calques nommés [NOM]
    const m = /^\[([A-Z_]+)\]$/.exec(l.name ?? "");
    if (!m) continue;

    const key = m[1]; // ex: AVATAR, VOICE_CHART
    const left = l.left ?? 0;
    const top = l.top ?? 0;
    const right = l.right ?? left;
    const bottom = l.bottom ?? top;
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const radius = Math.min(width, height) / 2;

    positions[key] = {
      x: left,
      y: top,
      width,
      height,
      centerX,
      centerY,
      radius,
    };

    console.log(`[PSD] Found reference layer [${key}] at (${left}, ${top}) - ${width}x${height}`);
  }

  return positions;
}

export const PsdRenderService = {
  renderFromPsd,
  renderFromPsdToBuffer,
  extractReferenceLayersFromPsd
};

