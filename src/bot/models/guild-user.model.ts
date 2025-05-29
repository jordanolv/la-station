import mongoose, { Schema, Document } from 'mongoose';

export interface IGuildUser extends Document {
  discordId: string;
  name: string;
  guildId: string;
  guild?: any;
  profil: {
    money: number;
    exp: number;
    lvl: number;
  };
  bio: string;
  stats: {
    totalMsg: number;
    voiceTime: number;
    voiceHistory: Array<{
      date: Date;
      time: number;
    }>;
  };
  infos: {
    birthDate: Date;
  };
}

const GuildUserSchema = new Schema<IGuildUser>({
  discordId: { type: String, required: true },
  name: { type: String, required: true },
  guildId: { type: String, required: true },
  profil: {
    money: { type: Number, default: 500 },
    exp: { type: Number, default: 0 },
    lvl: { type: Number, default: 1 }
  },
  bio: { type: String },
  stats: {
    totalMsg: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 },
    voiceHistory: [{
      date: { type: Date, default: Date.now },
      time: { type: Number, default: 0 }
    }]
  },
  infos: {
    registeredAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    birthDate: { type: Date }
  }
}, {
  timestamps: true,
  collection: 'guild_users'
});

GuildUserSchema.index({ discordId: 1, guildId: 1 }, { unique: true });

const GuildUserModel = mongoose.model<IGuildUser>('GuildUser', GuildUserSchema);

export default GuildUserModel; 