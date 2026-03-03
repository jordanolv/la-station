/**
 * Script de test pour vérifier le chargement des fonts
 */

const { initializeCanvas } = require('../dist/shared/canvas-init');
const { GlobalFonts } = require('@napi-rs/canvas');

console.log('🧪 Testing font loading...\n');

// Initialiser le canvas
initializeCanvas();

// Vérifier les fonts chargées
console.log('\n📋 Registered fonts:');
const fonts = GlobalFonts.families;
console.log(fonts);

// Vérifier si HelveticaNeueLTStd-Bd est disponible
if (fonts.includes('HelveticaNeueLTStd-Bd')) {
  console.log('\n✅ HelveticaNeueLTStd-Bd is loaded!');
} else {
  console.log('\n❌ HelveticaNeueLTStd-Bd is NOT loaded!');
}

if (fonts.includes('Inter')) {
  console.log('✅ Inter is loaded!');
} else {
  console.log('❌ Inter is NOT loaded!');
}
