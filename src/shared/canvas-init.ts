/**
 * Initialisation du canvas (@napi-rs/canvas et ag-psd)
 * Ce fichier doit être importé au démarrage de l'application
 */

import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { initializeCanvas as initAgPsd } from 'ag-psd';
import path from 'path';

let isInitialized = false;

/**
 * Initialise @napi-rs/canvas en chargeant les polices nécessaires
 */
export function initializeCanvas() {
  if (isInitialized) {
    console.log('[Canvas] Already initialized');
    return;
  }

  console.log('[Canvas] Initializing @napi-rs/canvas and ag-psd...');

  try {
    // Initialiser ag-psd avec @napi-rs/canvas
    initAgPsd(createCanvas as any);
    console.log('[Canvas] ✅ ag-psd initialized');

    // Charger Helvetica Neue (utilisée par le PSD)
    const helveticaPaths = [
      path.resolve(process.cwd(), 'src/assets/fonts/HelveticaNeueLTStd-Bd.otf'),
      path.resolve(process.cwd(), 'dist/assets/fonts/HelveticaNeueLTStd-Bd.otf'),
    ];

    let helveticaLoaded = false;
    for (const fontPath of helveticaPaths) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'HelveticaNeueLTStd-Bd');
        console.log(`[Canvas] ✅ HelveticaNeueLTStd-Bd loaded from: ${fontPath}`);
        helveticaLoaded = true;
        break;
      } catch (error) {
        // Essayer le chemin suivant
        continue;
      }
    }

    if (!helveticaLoaded) {
      console.warn('[Canvas] ⚠️  HelveticaNeueLTStd-Bd not found, text rendering may be affected');
    }

    // Charger Helvetica Neue Roman
    const helveticaRomanPaths = [
      path.resolve(process.cwd(), 'src/assets/fonts/helvetica-neue-lt-std-roman.otf'),
      path.resolve(process.cwd(), 'dist/assets/fonts/helvetica-neue-lt-std-roman.otf'),
    ];

    for (const fontPath of helveticaRomanPaths) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'HelveticaNeueLTStd-Roman');
        console.log(`[Canvas] ✅ HelveticaNeueLTStd-Roman loaded from: ${fontPath}`);
        break;
      } catch (error) {
        continue;
      }
    }

    // Charger Inter depuis @fontsource (utilisé pour les overlays canvas)
    try {
      const interPath = require.resolve('@fontsource/inter/files/inter-latin-600-normal.ttf');
      GlobalFonts.registerFromPath(interPath, 'Inter');
      console.log(`[Canvas] ✅ Inter loaded from @fontsource`);
    } catch (error) {
      console.warn('[Canvas] ⚠️  Inter font not found');
    }

    // Charger les emojis si disponibles
    try {
      const emojiPath = require.resolve('@fontsource/noto-color-emoji/files/noto-color-emoji-regular-400-normal.ttf');
      GlobalFonts.registerFromPath(emojiPath, 'NotoColorEmoji');
      console.log('[Canvas] ✅ Emoji font loaded');
    } catch (error) {
      // Pas grave si les emojis ne sont pas disponibles
    }

    isInitialized = true;
    console.log('[Canvas] ✅ Initialization complete');
  } catch (error) {
    console.error('[Canvas] ❌ Error during initialization:', error);
    // On continue quand même, le canvas utilisera les polices système
    isInitialized = true;
  }
}

/**
 * Vérifie si le canvas est initialisé
 */
export function isCanvasInitialized(): boolean {
  return isInitialized;
}

