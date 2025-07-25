import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export class ImageUploadService {
  private static readonly UPLOADS_DIR = path.resolve(__dirname, '../../../uploads')
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  /**
   * Initialise le répertoire d'upload s'il n'existe pas
   */
  private static async ensureUploadsDir(): Promise<string> {
    await mkdir(this.UPLOADS_DIR, { recursive: true })
    return this.UPLOADS_DIR
  }

  /**
   * Valide un fichier image
   */
  private static validateImage(file: File): void {
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Fichier trop volumineux. Maximum ${this.MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Type de fichier non supporté. Types autorisés: ${this.ALLOWED_TYPES.join(', ')}`)
    }
  }

  /**
   * Génère un nom de fichier unique
   */
  private static generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = path.extname(originalName)
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20)
    
    return `${timestamp}_${random}_${baseName}${extension}`
  }

  /**
   * Upload une image et retourne l'URL relative
   */
  static async uploadImage(file: File | null): Promise<string | undefined> {
    if (!file || file.size === 0) {
      return undefined
    }

    try {
      // Validation
      this.validateImage(file)

      // Préparation des chemins
      const uploadsDir = await this.ensureUploadsDir()
      const fileName = this.generateFileName(file.name)
      const filePath = path.join(uploadsDir, fileName)

      // Conversion et sauvegarde
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(filePath, buffer)

      // Retour de l'URL relative
      return `/uploads/${fileName}`
    } catch (error) {
      console.error('[IMAGE_UPLOAD] Erreur:', error)
      throw error
    }
  }

  /**
   * Upload multiple images (pour usage futur)
   */
  static async uploadImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file))
    const results = await Promise.allSettled(uploadPromises)
    
    return results
      .filter((result): result is PromiseFulfilledResult<string | undefined> => 
        result.status === 'fulfilled' && result.value !== undefined
      )
      .map(result => result.value as string)
  }

  /**
   * Vérifie si un fichier est une image valide (utilisé côté frontend)
   */
  static isValidImageFile(file: File): boolean {
    try {
      this.validateImage(file)
      return true
    } catch {
      return false
    }
  }

  /**
   * Obtient la taille formatée d'un fichier
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }
}