import mongoose, { Schema, Document } from 'mongoose';

// Interface pour un utilisateur dans la base de données
export interface IUser extends Document {
  userId: string;
  guildId: string;
  username: string;
  joinedAt: Date;
  settings: {
    notifications: boolean;
    language: string;
  };
}

// Interface pour un serveur dans la base de données
export interface IGuild extends Document {
  guildId: string;
  name: string;
  prefix: string;
  joinedAt: Date;
  settings: {
    welcomeChannel: string | null;
    modLogChannel: string | null;
    autoRole: string | null;
  };
}

// Interface pour les modèles de la base de données
export interface DatabaseModels {
  User: mongoose.Model<IUser>;
  Guild: mongoose.Model<IGuild>;
}