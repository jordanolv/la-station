import mongoose from 'mongoose';
import UserModel from '../models/GuildUser.js';
import { UserService } from '../services/UserService.js';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('📦 Connecté à MongoDB');

  try {
    const result = await UserModel.updateMany(
      { 'infos.birthDate': { $exists: false } },
      {
        $set: {
          'infos.birthDate': null,
        },
      }
    );

    console.log(`✅ Mise à jour terminée : ${result.modifiedCount} users mises à jour.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des users:', error);
    process.exit(1);
  }
})();

