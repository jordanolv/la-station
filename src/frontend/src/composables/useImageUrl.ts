const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

/**
 * Composable pour gérer les URLs d'images de manière centralisée
 */
export function useImageUrl() {
  
  /**
   * Transforme un nom de fichier ou chemin relatif en URL complète
   * @param imagePath - Le chemin ou nom de fichier de l'image
   * @returns L'URL complète de l'image ou null si pas d'image
   */
  const getImageUrl = (imagePath: string | undefined | null): string | null => {
    if (!imagePath) return null
    
    // Si c'est déjà une URL complète (http/https), on la retourne telle quelle
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }
    
    // Si c'est un chemin relatif, on le préfixe avec l'URL de base du serveur
    // On s'assure qu'il n'y a pas de double slash
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
    return `${API_BASE_URL}${cleanPath}`
  }

  return {
    getImageUrl
  }
}