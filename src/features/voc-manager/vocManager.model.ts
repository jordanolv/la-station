import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for individual join channel configuration
export interface IJoinChannel {
  id: string;
  category: string;
  nameTemplate: string;
}

export interface IVocManager extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  joinChannels: IJoinChannel[];  // Array of join channel configurations
  createdChannels: string[];
  channelCount: number;
}

const JoinChannelSchema = new Schema({
  id: { type: String, required: true },
  category: { type: String, required: true},
  nameTemplate: { type: String, default: '🎮 {username}' },
});

const VocManagerSchema = new Schema<IVocManager>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  joinChannels: { type: [JoinChannelSchema], default: [] },
  createdChannels: { type: [String], default: [] },
  channelCount: { type: Number, default: 0 },
}, {
  collection: 'voice_channel_managers'
});

const VocManagerModel = mongoose.model<IVocManager>('VoiceChannelManager', VocManagerSchema);

export default VocManagerModel; 