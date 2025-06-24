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

// Utiliser un nom de modèle qui correspond à la collection pour éviter les conflits
const GlobalUserModel = mongoose.models.Global_User || mongoose.model<IGlobalUser>('Global_User', GlobalUserSchema);

export default GlobalUserModel; 