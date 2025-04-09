import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  id: string;
  username: string;
  registeredAt: Date;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
});



const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;