import { prop, getModelForClass } from '@typegoose/typegoose';
import { Types } from 'mongoose';

export class ChatGamingItem {
  _id!: Types.ObjectId;

  @prop({ required: true })
  name!: string;

  @prop()
  description?: string;

  @prop()
  image?: string;

  @prop()
  banner?: string;

  @prop()
  color?: string;

  @prop({ required: true })
  guildId!: string;

  @prop()
  threadId?: string;

  @prop()
  messageId?: string;

  @prop()
  roleId?: string;

  // Timestamps ajoutés automatiquement par Mongoose
  createdAt!: Date;
  updatedAt!: Date;
}

// Créer le modèle
export const ChatGamingItemModel = getModelForClass(ChatGamingItem, {
  schemaOptions: {
    timestamps: true,
    collection: 'chat_gaming_items'
  }
});

// Export par défaut pour compatibilité
export default ChatGamingItemModel;

// Garde l'interface pour la compatibilité
export type IChatGamingItem = ChatGamingItem;