import { readFileSync, writeFileSync } from 'fs'
import { sync as globSync } from 'glob'
import path from 'path'

// Fonction pour fixer les imports
function fixAliases(filePath) {
  let content = readFileSync(filePath, 'utf8')

  // Remplacer @/ par chemin relatif
  content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, p1) => {
    const relativePath = path.relative(path.dirname(filePath), path.resolve('src', p1))
    const normalizedPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`
    return `from '${normalizedPath.replace(/\\/g, '/')}.js'`
  })

  // Remplacer @database/ par chemin relatif
  content = content.replace(/from\s+['"]@database\/([^'"]+)['"]/g, (match, p1) => {
    const relativePath = path.relative(path.dirname(filePath), path.resolve('src/database', p1))
    const normalizedPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`
    return `from '${normalizedPath.replace(/\\/g, '/')}.js'`
  })

  writeFileSync(filePath, content)
}

// Trouver tous les fichiers .ts et .tsx
const files = globSync('src/**/*.{ts,tsx}', {
  ignore: ['node_modules/**', 'dist/**']
})

files.forEach(fixAliases)

console.log('✅ Alias "@/..." et "@database/..." remplacés par des imports relatifs.')
