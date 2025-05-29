import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatGaming extends Document {
  _id: Types.ObjectId;
  guildId: string;
  enabled: boolean;
  channelId: string;
}

const ChatGamingSchema = new Schema<IChatGaming>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: '' },
});

const ChatGamingModel = mongoose.model<IChatGaming>('ChatGaming', ChatGamingSchema);

export default ChatGamingModel;
