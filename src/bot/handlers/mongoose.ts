import { db } from '../../database/index.js';
import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config();

/**
 * Établit la connexion avec la base de données MongoDB
 */
export async function connectToDatabase(MONGODB_URI: string): Promise<void> {
  try {
    // Utilisation du service de base de données externalisé
    console.log(MONGODB_URI)
    await db.connect(MONGODB_URI);
  } catch (error) {
    console.error('Erreur lors de la connexion à MongoDB:', error);
    process.exit(1);
  }
}