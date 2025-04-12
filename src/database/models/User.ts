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
    voiceTime: number;
    voiceHistory: Array<{
      date: Date;
      time: number;
    }>;
  };
  infos: {
    registeredAt: Date;
    updatedAt: Date;
    birthDate: Date;
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
      totalMsg: { type: Number, default: 0 },
      voiceTime: { type: Number, default: 0 },
      voiceHistory: [{
        date: { type: Date, default: Date.now },
        time: { type: Number, default: 0 }
      }]
    },
    _id: false
  },
  infos: {
    type: {
      registeredAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      birthDate: { type: Date }
    },
    _id: false
  }
});

UserSchema.pre('save', function (next) {
  if (!this.isModified()) return next();
  this.infos.updatedAt = new Date();
  next();
});

UserSchema.pre('findOneAndUpdate', function (next) {
  this.set({ 'infos.updatedAt': new Date() });
  next();
});

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;