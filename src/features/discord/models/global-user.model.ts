import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalUser extends Document {
  id: string;
  name: string;
}

const GlobalUserSchema = new Schema<IGlobalUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'global_users'
});

// Vérifier si le modèle existe déjà pour éviter l'erreur OverwriteModelError
const GlobalUserModel = mongoose.models.GlobalUser || mongoose.model<IGlobalUser>('GlobalUser', GlobalUserSchema);

export default GlobalUserModel; 