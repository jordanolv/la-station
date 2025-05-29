import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeveling extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  taux: number;
}

const LevelingSchema = new Schema<ILeveling>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  taux: { type: Number, default: 1 }
});

const LevelingModel = mongoose.model<ILeveling>('Leveling', LevelingSchema);

export default LevelingModel;
