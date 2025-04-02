import mongoose, { Schema, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string;
  name: string;
  registeredAt: Date;
  config: {
    prefix: string;
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
  };
}

const GuildSchema = new Schema<IGuild>({
  guildId: { type: String, required: true, unique: true },
  name: String,
  registeredAt: Date,
  config: {
    prefix: String,
  },
  features: {
    logs: {
      enabled: Boolean,
      channel: String,
    },
    vocGaming: {
      enabled: Boolean,
      channelToJoin: String,
      channelsCreated: [String],
      nbChannelsCreated: Number,
    },
    chatGaming: {
      enabled: Boolean,
      channelId: String,
      channelsList: [String],
      reactionsList: [String],
      nbForumCreated: Number,
    },
  },
});

const GuildModel = mongoose.model<IGuild>('Guild', GuildSchema);

export default GuildModel;
