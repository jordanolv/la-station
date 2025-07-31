import { v2 as cloudinary } from 'cloudinary'
import path from 'path'

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  // Configuration Cloudinary (singleton)
  private static isConfigured = false
  
  private static configureCloudinary() {
    if (!this.isConfigured) {
      console.log('[CLOUDINARY] Configuration du service partagé:', {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET'
      })
      
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      })
      
      this.isConfigured = true
    }
  }

  /**
   * Génère un public_id unique pour Cloudinary
   */
  private static generatePublicId(originalName: string, folder?: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const baseName = path.basename(originalName, path.extname(originalName))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20)
    
    const id = `${timestamp}_${random}_${baseName}`
    return folder ? `${folder}/${id}` : id
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
   * Upload une image vers Cloudinary et retourne l'URL publique
   * @param file - Le fichier à uploader
   * @param folder - Dossier de destination (ex: 'party', 'welcome', 'avatars')
   * @param transformations - Transformations Cloudinary personnalisées
   */
  static async uploadImage(
    file: File | null, 
    folder: string = 'uploads',
    transformations?: any[]
  ): Promise<string | undefined> {
    if (!file || file.size === 0) {
      return undefined
    }

    try {
      // Configuration automatique
      this.configureCloudinary()

      // Validation
      this.validateImage(file)

      // Conversion en buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Génération du public_id
      const publicId = this.generatePublicId(file.name)
      const fullFolder = `the-ridge/${folder}`

      console.log(`[IMAGE_UPLOAD] Upload vers ${fullFolder}/${publicId}`)

      // Transformations par défaut
      const defaultTransformations = [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString('base64')}`, {
        public_id: publicId,
        resource_type: 'image',
        folder: fullFolder,
        overwrite: true,
        transformation: transformations || defaultTransformations
      })

      console.log(`[IMAGE_UPLOAD] Fichier uploadé avec succès: ${result.public_id}`)

      return result.secure_url
    } catch (error) {
      console.error('[IMAGE_UPLOAD] Erreur:', error)
      throw error
    }
  }

  /**
   * Upload spécifique pour les images de Party
   */
  static async uploadPartyImage(file: File | null): Promise<string | undefined> {
    return this.uploadImage(file, 'party')
  }

  /**
   * Upload spécifique pour les images de Welcome
   */
  static async uploadWelcomeImage(file: File | null): Promise<string | undefined> {
    return this.uploadImage(file, 'welcome')
  }

  /**
  * Upload spécifique pour les images de Chat Gaming
  */
  static async uploadGameImage(file: File | null): Promise<string | undefined> {
    return this.uploadImage(file, 'games')
  }

  /**
   * Upload spécifique pour les avatars
   */
  static async uploadAvatarImage(file: File | null): Promise<string | undefined> {
    return this.uploadImage(file, 'avatars', [
      { width: 400, height: 400, crop: 'fill' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ])
  }

  /**
   * Upload multiple images
   */
  static async uploadImages(files: File[], folder: string = 'uploads'): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, folder))
    const results = await Promise.allSettled(uploadPromises)
    
    return results
      .filter((result): result is PromiseFulfilledResult<string | undefined> => 
        result.status === 'fulfilled' && result.value !== undefined
      )
      .map(result => result.value as string)
  }

  /**
   * Vérifie si un fichier est une image valide
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

  /**
   * Obtient les contraintes d'upload (pour affichage côté frontend)
   */
  static getUploadConstraints() {
    return {
      maxFileSize: this.MAX_FILE_SIZE,
      maxFileSizeFormatted: this.formatFileSize(this.MAX_FILE_SIZE),
      allowedTypes: this.ALLOWED_TYPES,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    }
  }
}