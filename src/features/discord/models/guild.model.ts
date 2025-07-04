import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGuild extends Document {
  _id: Types.ObjectId;
  guildId: string;
  name: string;
  registeredAt: Date;
  config: {
    prefix: string;
    colors: {
      primary: string;
    };
    channels?: {
      birthday?: string;
      logs?: string;
    };
  };
}

const GuildSchema = new Schema<IGuild>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  guildId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  config: {
    prefix: { type: String, default: '!' },
    colors: {
      primary: { type: String, default: '#dac1ff' },
    },
    channels: {
      birthday: { type: String },
      logs: { type: String }
    }
  }
}, {
  collection: 'guilds'
});

// Utiliser un nom de modèle qui correspond à la collection pour éviter les conflits
const GuildModel = mongoose.models.Guild_Model || mongoose.model<IGuild>('Guild_Model', GuildSchema);

export default GuildModel;

GuildSchema.index({ id: 1 }, { unique: false }); 