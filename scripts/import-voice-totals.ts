import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import GuildUserModel from '../src/features/user/models/guild-user.model';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script pour importer les totaux voice depuis un fichier JSON
 * Usage: npx ts-node scripts/import-voice-totals.ts <chemin-vers-json>
 */

interface VoiceImportData {
  userId: string; // Discord ID
  hours: number; // heures
  messages: number; // nombre de messages
}

async function importVoiceTotals(jsonFilePath: string) {
  try {
    // Vérification du fichier
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`Fichier non trouvé: ${jsonFilePath}`);
    }

    // Lecture du JSON
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const voiceData: VoiceImportData[] = JSON.parse(jsonData);

    console.log(`📁 Fichier lu: ${voiceData.length} entrées trouvées`);

    // Connexion à la base de données
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connexion à MongoDB établie');

    let updated = 0;
    let notFound = 0;

    // Import des données
    for (const entry of voiceData) {
      const seconds = Math.round(entry.hours * 3600);

      // Vérifier si l'utilisateur existe
      const userExists = await GuildUserModel.findOne({ discordId: entry.userId });

      if (!userExists) {
        notFound++;
        console.log(`⚠️  Utilisateur ${entry.userId} non trouvé - ignoré`);
        continue;
      }

      const result = await GuildUserModel.updateOne(
        { discordId: entry.userId },
        {
          $set: {
            'stats.voiceTime': seconds,
            'stats.totalMsg': entry.messages
          }
        }
      );

      if (result.modifiedCount > 0) {
        updated++;
        console.log(`✅ ${entry.userId} -> ${seconds}s, ${entry.messages} messages`);
      } else {
        notFound++;
        console.log(`⚠️  ${entry.userId} échec mise à jour`);
      }
    }

    console.log(`\n📊 Résumé de l'import:`);
    console.log(`   - Utilisateurs mis à jour: ${updated}`);
    console.log(`   - Utilisateurs non trouvés: ${notFound}`);
    console.log(`   - Total traité: ${voiceData.length}`);

    await mongoose.disconnect();
    console.log('✅ Déconnexion de MongoDB');
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    process.exit(1);
  }
}

// Récupération du chemin du fichier JSON
const jsonFilePath = process.argv[2];
if (!jsonFilePath) {
  console.error('❌ Usage: npx ts-node scripts/import-voice-totals.ts <chemin-vers-json>');
  process.exit(1);
}

const absolutePath = path.resolve(jsonFilePath);
importVoiceTotals(absolutePath);