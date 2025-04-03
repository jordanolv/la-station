import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
  name: string;
  description: string;
  image: string;
  color: string;
  guildId: string;
  threadId: string;
  messageId: string;
  roleId: string;
  reactions?: Array<{
    messageId: string;
    emoji: string;
    roleId: string;
  }>;
}

const GameSchema = new Schema<IGame>({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  color: { type: String },
  guildId: { type: String, required: true },
  threadId: { type: String },
  messageId: { type: String },
  roleId: { type: String },
  reactions: [{
    messageId: { type: String },
    emoji: { type: String },
    roleId: { type: String }
  }]
});

const GameModel = mongoose.model<IGame>('Game', GameSchema);

export default GameModel; 