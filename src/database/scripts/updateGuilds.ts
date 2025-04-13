import mongoose from 'mongoose';
import GuildModel from '@/database/models/Guild';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('📦 Connecté à MongoDB');

  try {
    const result = await GuildModel.updateMany(
      { 'features.leveling': { $exists: false } },
      {
        $set: {
          'features.leveling': {
            enabled: true,
            taux: 1,
          },
        },
      },
    );

    const updateColors = await GuildModel.updateMany(
      { 'config.colors': { $exists: false }},
      {
        $set: {
          'config.colors.primary': '#dac1ff',
        },
      }
    );

    console.log(`✅ Mise à jour terminée : ${result.modifiedCount} guildes mises à jour.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des guildes:', error);
    process.exit(1);
  }
})();
