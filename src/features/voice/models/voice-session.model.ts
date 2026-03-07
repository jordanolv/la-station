import { prop, getModelForClass, index, DocumentType } from '@typegoose/typegoose';

/**
 * Session vocale persistée pour survivre aux redémarrages du bot.
 * Permet de conserver le timer (startedAt, activeSeconds) lors de la réhydratation.
 */
@index({ userId: 1 }, { unique: true })
@index({ channelId: 1 })
export class VoiceSession {
  @prop({ required: true })
  userId!: string;

  @prop({ required: true })
  guildId!: string;

  @prop({ required: true })
  channelId!: string;

  @prop({ required: true })
  channelName!: string;

  /** Timestamp de début de session (pour durationSeconds) */
  @prop({ required: true })
  startedAt!: Date;

  /** Secondes actives cumulées (sans mute/deaf) */
  @prop({ default: 0 })
  totalActiveSeconds!: number;

  /** Début de la période active en cours, ou null si en pause */
  @prop({ type: () => Date, required: false, default: null })
  currentActiveStart?: Date | null;

  @prop({ default: Date.now })
  updatedAt!: Date;
}

const VoiceSessionModel = getModelForClass(VoiceSession, {
  schemaOptions: {
    collection: 'voice_sessions',
    timestamps: false,
  },
});

export type IVoiceSessionDoc = DocumentType<VoiceSession>;
export default VoiceSessionModel;
