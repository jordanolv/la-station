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

// Liste des dossiers à copier
const assetsToCopy = [
  { source: '../canva', dest: '../dist/canva', name: 'canva/' },
  { source: '../src/assets', dest: '../dist/assets', name: 'src/assets/' }
];

let copiedCount = 0;

assetsToCopy.forEach(({ source, dest, name }) => {
  const sourcePath = path.resolve(__dirname, source);
  const destPath = path.resolve(__dirname, dest);

  if (fs.existsSync(sourcePath)) {
    console.log(`\n📁 Copying ${name}...`);
    copyDir(sourcePath, destPath);
    copiedCount++;
  } else {
    console.warn(`⚠️  Warning: ${name} directory not found`);
  }
});

console.log(`\n✅ ${copiedCount} asset directories copied successfully!`);
