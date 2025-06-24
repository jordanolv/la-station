import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBirthday extends Document {
  _id: Types.ObjectId;
  guildId: string;
  channel: string;
  enabled: boolean;
}

const BirthdaySchema = new Schema<IBirthday>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  channel: { type: String, default: '' },
  enabled: { type: Boolean, default: false }
}, {
  collection: 'birthdays'
});

const BirthdayModel = mongoose.model<IBirthday>('Birthday', BirthdaySchema);

export default BirthdayModel; 