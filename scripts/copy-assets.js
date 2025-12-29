/**
 * Script pour copier les fichiers statiques dans le dossier dist/ après le build
 */

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  // Créer le dossier de destination s'il n'existe pas
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied: ${srcPath} → ${destPath}`);
    }
  }
}

console.log('📦 Copying static assets...\n');

// Copier le dossier canva/
const canvaSource = path.resolve(__dirname, '../canva');
const canvaDest = path.resolve(__dirname, '../dist/canva');

if (fs.existsSync(canvaSource)) {
  copyDir(canvaSource, canvaDest);
  console.log('\n✅ Static assets copied successfully!');
} else {
  console.warn('⚠️  Warning: canva/ directory not found');
}
