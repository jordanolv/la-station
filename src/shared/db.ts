import mongoose from 'mongoose';

// Classe singleton pour gérer la connexion à la base de données
class Database {
  private static instance: Database;
  private _isConnected: boolean = false;

  private constructor() {
    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      this._isConnected = true;
    });

    mongoose.connection.on('disconnected', () => {
      this._isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      const chalk = require('chalk');
      console.error(chalk.red('❌ [DB]'), err);
    });

    // Gestion propre de la déconnexion
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  }

  /**
   * Obtient l'instance unique de la base de données (patron Singleton)
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connecte à la base de données MongoDB
   * @param uri L'URI de connexion MongoDB
   */
  public async connect(uri: string): Promise<void> {
    if (this._isConnected) {
      return;
    }

    try {
      await mongoose.connect(uri, {});
    } catch (error) {
      const chalk = require('chalk');
      console.error(chalk.red('❌ [DB] Erreur de connexion:'), error);
      throw error;
    }
  }

  /**
   * Déconnecte de la base de données
   */
  public async disconnect(): Promise<void> {
    if (!this._isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this._isConnected = false;
      console.log('Déconnecté de MongoDB');
    } catch (error) {
      console.error('Erreur lors de la déconnexion de MongoDB:', error);
      throw error;
    }
  }

  /**
   * Vérifie si la base de données est connectée
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }
}

// Export de l'instance de la base de données
export const db = Database.getInstance();

// Fonction de compatibilité avec l'ancien code
export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await db.connect(MONGODB_URI);
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
} 