import { prop, getModelForClass } from '@typegoose/typegoose';
import { Types } from 'mongoose';

export class EventInfo {
  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  game!: string;

  @prop()
  description?: string;

  @prop({ required: true })
  dateTime!: Date;

  @prop({ required: true, min: 1, max: 50 })
  maxSlots!: number;

  @prop()
  image?: string;

  @prop({ default: '#FF6B6B' })
  color!: string;
}

export class DiscordInfo {
  @prop({ required: true })
  guildId!: string;

  @prop({ required: true })
  channelId!: string;

  @prop()
  messageId?: string;

  @prop()
  roleId?: string;
}

export class PartyItem {
  _id!: Types.ObjectId;

  @prop({ type: () => EventInfo, required: true })
  eventInfo!: EventInfo;

  @prop({ type: () => DiscordInfo, required: true })
  discord!: DiscordInfo;

  @prop({ type: () => [String], default: [] })
  participants!: string[];

  @prop({ required: true })
  createdBy!: string;

  @prop()
  chatGamingGameId?: string; // ID du jeu chat-gaming associé (optionnel)

  @prop({ enum: ['pending', 'started', 'ended'], default: 'pending' })
  status!: 'pending' | 'started' | 'ended';

  @prop({ type: () => [String], default: [] })
  attendedParticipants!: string[]; // Participants effectivement présents à la soirée

  @prop()
  rewardAmount?: number; // Montant d'argent distribué aux participants

  @prop()
  xpAmount?: number; // Montant d'XP distribué aux participants

  @prop()
  startedAt?: Date; // Date de début de la soirée

  @prop()
  endedAt?: Date; // Date de fin de la soirée
}

// Créer le modèle
export const PartyItemModel = getModelForClass(PartyItem, {
  schemaOptions: {
    timestamps: true,
    collection: 'party_items'
  }
});

// Export par défaut pour compatibilité
export default PartyItemModel;

// Garde les interfaces pour la compatibilité
export type IEventInfo = EventInfo;
export type IDiscordInfo = DiscordInfo;
export type IPartyItem = PartyItem;
export type IEvent = PartyItem; // Pour compatibilité avec l'ancien nom