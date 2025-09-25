import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GuildUserModel from '../src/features/user/models/guild-user.model';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script pour reset toutes les statistiques voice à 0
 * Usage: npx ts-node scripts/reset-voice-stats.ts
 */

async function resetVoiceStats() {
  try {
    // Connexion à la base de données
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connexion à MongoDB établie');

    // Reset de toutes les stats
    const result = await GuildUserModel.updateMany(
      {}, // Tous les utilisateurs
      {
        $set: {
          'stats.voiceTime': 0,
          'stats.voiceHistory': [],
          'stats.totalMsg': 0
        }
      }
    );

    console.log(`✅ Stats remises à zéro pour ${result.modifiedCount} utilisateurs`);

    await mongoose.disconnect();
    console.log('✅ Déconnexion de MongoDB');
  } catch (error) {
    console.error('❌ Erreur lors du reset:', error);
    process.exit(1);
  }
}

resetVoiceStats();