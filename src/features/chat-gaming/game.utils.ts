import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Assure l'existence du dossier des uploads et renvoie son chemin
 */
export async function createUploadsDir(): Promise<string> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
    console.log('Dossier uploads créé/vérifié à:', uploadsDir);
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
  return uploadsDir;
}

/**
 * Sauvegarde un fichier image téléchargé et retourne l'URL de l'image
 */
export async function saveGameImage(gameImage: File): Promise<string | undefined> {
  if (!gameImage || gameImage.size === 0) {
    return undefined;
  }

  try {
    const uploadsDir = await createUploadsDir();
    const fileName = `${Date.now()}-${gameImage.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    console.log('Sauvegarde de l\'image dans:', filePath);
    
    // Convertir File en Buffer
    const arrayBuffer = await gameImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Sauvegarder le fichier
    await writeFile(filePath, buffer);
    
    // Créer l'URL pour l'image (relatif à la racine de l'API)
    const imageUrl = `/uploads/${fileName}`;
    console.log('URL de l\'image:', imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'image:', error);
    return undefined;
  }
} 