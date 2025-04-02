import mongoose, { Schema, Document } from 'mongoose';

interface IGuild {
  guildId: string;
  guildName: string;
}

export interface IMember extends Document {
  id: string;
  name: string;
  guild: IGuild;
  profil: {
    money: number;
    exp: number;
    lvl: number;
  };
  bio: string;
  stats: {
    totalMsg: number;
  };
  infos: {
    registeredAt: Date;
  };
}

const GuildSchema = new Schema<IGuild>({
  guildId: { type: String },
  guildName: { type: String }
});

const MemberSchema = new Schema<IMember>({
  id: { type: String, required: true, unique: true },
  name: { type: String },
  guild: {
    type: GuildSchema,
    default: {}
  },
  profil: {
    type: {
      money: { type: Number, default: 500 },
      exp: { type: Number, default: 0 },
      lvl: { type: Number, default: 0 }
    }
  },
  bio: { type: String },
  stats: {
    type: {
      totalMsg: { type: Number, default: 0 }
    }
  },
  infos: {
    type: {
      registeredAt: { type: Date, default: Date.now }
    }
  }
});

const MemberModel = mongoose.model<IMember>('Member', MemberSchema);

export default MemberModel;