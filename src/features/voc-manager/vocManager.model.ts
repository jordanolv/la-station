import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for individual join channel configuration
export interface IJoinChannel {
  id: string;
  category: string;
  nameTemplate: string;
}

// Interface for channel statistics
export interface IChannelStats {
  channelId: string;
  createdAt: Date;
  createdBy: string;
  totalUsers: number;
  sessionDuration: number; // in seconds
  lastActivity: Date;
}

export interface IVocManager extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  joinChannels: IJoinChannel[];  // Array of join channel configurations
  createdChannels: string[];
  channelCount: number;
  channelStats: IChannelStats[]; // Statistics for created channels
}

const JoinChannelSchema = new Schema({
  id: { type: String, required: true },
  category: { type: String, required: true},
  nameTemplate: { type: String, default: '🎮 {username} #{count}' },
});

const ChannelStatsSchema = new Schema({
  channelId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  totalUsers: { type: Number, default: 0 },
  sessionDuration: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
});

const VocManagerSchema = new Schema<IVocManager>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  joinChannels: { type: [JoinChannelSchema], default: [] },
  createdChannels: { type: [String], default: [] },
  channelCount: { type: Number, default: 0 },
  channelStats: { type: [ChannelStatsSchema], default: [] }
}, {
  collection: 'voice_channel_managers'
});

const VocManagerModel = mongoose.model<IVocManager>('VoiceChannelManager', VocManagerSchema);

export default VocManagerModel; 