import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGame extends Document {
  name: string;
  description?: string;
  image?: string;
  color?: string;
  guildId: string;
  reactions?: Array<{
    threadId: string;
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
  reactions: [{
    threadId: { type: String },
    emoji: { type: String },
    roleId: { type: String }
  }]
}, {
  timestamps: true
});



const GameModel = mongoose.model<IGame>('Game', GameSchema);

export default GameModel; 