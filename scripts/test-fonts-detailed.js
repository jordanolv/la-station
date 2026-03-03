/**
 * Script de test détaillé pour vérifier le chargement des fonts
 */

const { GlobalFonts, createCanvas } = require('@napi-rs/canvas');
const path = require('path');

console.log('🧪 Testing font loading in detail...\n');

// Tester le chargement manuel
const helveticaPath = path.resolve(process.cwd(), 'dist/assets/fonts/HelveticaNeueLTStd-Bd.otf');
console.log(`Trying to load: ${helveticaPath}`);

try {
  const result = GlobalFonts.registerFromPath(helveticaPath, 'HelveticaNeueLTStd-Bd');
  console.log('✅ Font registered successfully, result:', result);
} catch (error) {
  console.error('❌ Error registering font:', error.message);
}

// Tester le rendu avec cette font
console.log('\n🎨 Testing font rendering...');
const canvas = createCanvas(400, 100);
const ctx = canvas.getContext('2d');

ctx.font = '30px "HelveticaNeueLTStd-Bd"';
ctx.fillStyle = '#000000';
ctx.fillText('Test Font HelveticaNeueLTStd-Bd', 10, 50);

console.log('✅ Text rendered without error');

// Vérifier quelle font est réellement utilisée
const metrics = ctx.measureText('Test');
console.log('Text metrics:', metrics);

console.log('\n📋 All registered font families:');
console.log('Total:', GlobalFonts.families.length);
