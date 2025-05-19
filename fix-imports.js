import { readFileSync, writeFileSync } from 'fs'
import { sync as globSync } from 'glob'

// Fonction pour corriger les imports relatifs
function fixImports(filePath) {
  let content = readFileSync(filePath, 'utf8')

  content = content.replace(
    /from ['"](\.\.?\/[^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.match(/\.[jt]sx?$/)) {
        return match
      }
      return `from '${importPath}.js'`
    }
  )

  writeFileSync(filePath, content)
}

const files = globSync('src/**/*.{ts,tsx}', {
  ignore: ['node_modules/**', 'dist/**']
})

files.forEach(fixImports)

console.log('✅ Importations relatives corrigées avec succès.')
