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

    // Charger la police principale (Inter ou Helvetica)
    const fontPaths = [
      path.resolve(process.cwd(), 'src/assets/fonts/HelveticaNeueLTStd-Bd.otf'),
      path.resolve(process.cwd(), 'dist/assets/fonts/HelveticaNeueLTStd-Bd.otf'),
    ];

    let fontLoaded = false;
    for (const fontPath of fontPaths) {
      try {
        GlobalFonts.registerFromPath(fontPath, 'Inter');
        console.log(`[Canvas] ✅ Font loaded from: ${fontPath}`);
        fontLoaded = true;
        break;
      } catch (error) {
        // Essayer le chemin suivant
        continue;
      }
    }

    if (!fontLoaded) {
      // Essayer de charger depuis @fontsource
      try {
        const ttfPath = require.resolve('@fontsource/inter/files/inter-latin-600-normal.ttf');
        GlobalFonts.registerFromPath(ttfPath, 'Inter');
        console.log(`[Canvas] ✅ Font loaded from @fontsource`);
        fontLoaded = true;
      } catch (error) {
        console.warn('[Canvas] ⚠️  No custom font found, using system fonts');
      }
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

