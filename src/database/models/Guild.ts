import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGuild extends Document {
  _id: Types.ObjectId;
  guildId: string;
  name: string;
  registeredAt: Date;
  config: {
    prefix: string;
    channels: {
      birthday: string;
    };
  };
  features: {
    logs: {
      enabled: boolean;
      channel: string;
    };
    vocGaming: {
      enabled: boolean;
      channelToJoin: string;
      channelsCreated: string[];
      nbChannelsCreated: number;
    };
    chatGaming: {
      enabled: boolean;
      channelId: string;
      channelsList: string[];
      reactionsList: string[];
      nbForumCreated: number;
    };
    leveling: {
      enabled: boolean;
      taux: number;
    };
  };
}

const GuildSchema = new Schema<IGuild>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  config: {
    prefix: { type: String, default: '!' },
    channels: {
      birthday: { type: String, default: '' }
    }
  },
  features: {
    logs: {
      enabled: { type: Boolean, default: false },
      channel: { type: String, default: '' },
    },
    vocGaming: {
      enabled: { type: Boolean, default: false },
      channelToJoin: { type: String, default: '' },
      channelsCreated: { type: [String], default: [] },
      nbChannelsCreated: { type: Number, default: 0 },
    },
    chatGaming: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: '' },
      channelsList: { type: [String], default: [] },
      reactionsList: { type: [String], default: [] },
      nbForumCreated: { type: Number, default: 0 },
    },
    leveling: {
      enabled: { type: Boolean, default: true },
      taux: { type: Number, default: 1 }
    },
  },
});

const GuildModel = mongoose.model<IGuild>('Guild', GuildSchema);

export default GuildModel;

// Supprimer l'index sur id s'il existe
GuildSchema.index({ id: 1 }, { unique: false });

