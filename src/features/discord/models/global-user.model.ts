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

const GlobalUserModel = mongoose.model<IGlobalUser>('GlobalUser', GlobalUserSchema);

export default GlobalUserModel; 