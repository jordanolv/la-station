import { db } from '../../database';
import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot';

/**
 * Établit la connexion avec la base de données MongoDB
 */
export async function connectToDatabase(): Promise<void> {
  try {
    // Utilisation du service de base de données externalisé
    console.log(MONGODB_URI)
    await db.connect(MONGODB_URI);
  } catch (error) {
    console.error('Erreur lors de la connexion à MongoDB:', error);
    process.exit(1);
  }
}