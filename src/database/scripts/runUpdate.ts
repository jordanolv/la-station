import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { updateGuilds } from './updateGuilds';

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/la-station');
    console.log('Connecté à MongoDB');
    
    await updateGuilds();
    
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

main(); 