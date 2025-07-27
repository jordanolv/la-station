import { v2 as cloudinary } from 'cloudinary'
import path from 'path'

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  // Configuration Cloudinary
  static {
    console.log('[CLOUDINARY] Variables d\'environnement:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET'
    })
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
  }

  /**
   * Génère un public_id unique pour Cloudinary
   */
  private static generatePublicId(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const baseName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20)
    
    return `${timestamp}_${random}_${baseName}`
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
   * Upload une image vers Cloudinary et retourne l'URL publique
   */
  static async uploadImage(file: File | null): Promise<string | undefined> {
    if (!file || file.size === 0) {
      return undefined
    }

    try {
      // Force la reconfiguration de Cloudinary à chaque upload
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      })

      console.log('[IMAGE_UPLOAD] Config Cloudinary:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET'
      })

      // Validation
      this.validateImage(file)

      // Conversion en buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Génération du public_id
      const publicId = this.generatePublicId(file.name)

      console.log(`[IMAGE_UPLOAD] Upload vers Cloudinary: ${publicId}`)

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString('base64')}`, {
        public_id: publicId,
        resource_type: 'image',
        folder: 'the-ridge/party',
        overwrite: true,
        transformation: [
          { quality: 'auto:good' }, // Optimisation automatique
          { fetch_format: 'auto' }  // Format optimal selon le navigateur
        ]
      })

      console.log(`[IMAGE_UPLOAD] Fichier uploadé avec succès: ${result.public_id}`)

      // Retour de l'URL publique sécurisée
      return result.secure_url
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