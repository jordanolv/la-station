import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalUser extends Document {
  id: string;
  name: string;
  registeredAt: number;
}

const GlobalUserSchema = new Schema<IGlobalUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registeredAt: { type: Number, default: Date.now() },
}, {
  timestamps: false,
  collection: 'globalUsers'
});

const GlobalUserModel = mongoose.model<IGlobalUser>('GlobalUser', GlobalUserSchema);

export default GlobalUserModel;