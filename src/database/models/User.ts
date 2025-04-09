import mongoose, { Schema, Document } from 'mongoose';

interface IGuild {
  guildId: string;
  guildName: string;
}

export interface IUser extends Document {
  discordId: string;
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
    updatedAt: Date;
  };
}

const GuildSchema = new Schema<IGuild>({
  guildId: { type: String },
  guildName: { type: String }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  discordId: { type: String, required: true, unique: true },
  name: { type: String },
  guild: {
    type: GuildSchema,
    default: {}
  },
  profil: {
    type: {
      money: { type: Number, default: 500 },
      exp: { type: Number, default: 0 },
      lvl: { type: Number, default: 1 }
    },
    _id: false
  },
  bio: { type: String },
  stats: {
    type: {
      totalMsg: { type: Number, default: 0 }
    },
    _id: false
  },
  infos: {
    type: {
      registeredAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    },
    _id: false
  }
});

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;