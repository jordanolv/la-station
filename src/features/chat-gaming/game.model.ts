import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGame extends Document {
  name: string;
  description?: string;
  image?: string;
  color?: string;
  guildId: string;
  threadId?: string;
  messageId?: string;
  roleId?: string;
}

const GameSchema = new Schema<IGame>({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  color: { type: String },
  guildId: { type: String, required: true },
  threadId: { type: String },
  messageId: { type: String },
  roleId: { type: String }
}, {
  timestamps: true,
  collection: 'games'
});

// Utiliser un nom de modèle complètement différent pour éviter les conflits
const ChatGameModel = mongoose.models.ChatGame || mongoose.model<IGame>('ChatGame', GameSchema);

export default ChatGameModel; 