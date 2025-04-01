import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot';

/**
 * Établit la connexion avec la base de données MongoDB
 */
export async function connectToDatabase(): Promise<void> {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connexion à MongoDB établie avec succès!');
  } catch (error) {
    console.error('Erreur lors de la connexion à MongoDB:', error);
    process.exit(1);
  }
  
  mongoose.connection.on('error', (err) => {
    console.error('Erreur MongoDB:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('Déconnecté de MongoDB');
  });
  
  // Gestion propre de la déconnexion lors de l'arrêt de l'application
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Connexion MongoDB fermée suite à l\'arrêt de l\'application');
    process.exit(0);
  });
}