import mongoose from 'mongoose';

import UserModel from './models/GlobalUser';
import GuildModel from './models/Guild';

// Classe singleton pour gérer la connexion à la base de données
class Database {
  private static instance: Database;
  private _isConnected: boolean = false;


  private constructor() {


    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      this._isConnected = true;
      console.log('MongoDB connecté avec succès');
    });

    mongoose.connection.on('disconnected', () => {
      this._isConnected = false;
      console.log('MongoDB déconnecté');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Erreur MongoDB:', err);
    });

    // Gestion propre de la déconnexion
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Connexion MongoDB fermée suite à l\'arrêt de l\'application');
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
      console.log('Connexion à MongoDB...');
      await mongoose.connect(uri, {});
    } catch (error) {
      console.error('Erreur lors de la connexion à MongoDB:', error);
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

