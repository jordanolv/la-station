import mongoose, { Schema } from 'mongoose';

interface IUser {
  id: string;
  username: string;
  registeredAt: Date;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
});

UserSchema.statics.findByUserId = function(userId: string) {
  return this.findOne({ userId });
};

UserSchema.statics.findByGuildId = function(guildId: string) {
  return this.find({ guildId });
};

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;