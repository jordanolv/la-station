import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVocGaming extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  channelToJoin: string;
  channelsCreated: string[];
  countChannelsCreated: number;
}

const VocGamingSchema = new Schema<IVocGaming>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  channelToJoin: { type: String, default: '' },
  channelsCreated: { type: [String], default: [] },
  countChannelsCreated: { type: Number, default: 0 }
});

const VocGamingModel = mongoose.model<IVocGaming>('VocGaming', VocGamingSchema);

export default VocGamingModel;
