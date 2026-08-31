import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export interface JustePrixGuess {
  value: number;
  at: Date;
}

export class JustePrixState {
  @prop()
  nextSpawnAt?: Date;

  @prop()
  activeThreadId?: string;

  @prop()
  activeMessageId?: string;

  @prop()
  activeTarget?: number;

  @prop()
  activeEndsAt?: Date;

  /** userId -> { value, at } — une seule proposition par joueur, modifiable */
  @prop({ type: Object, default: {} })
  guesses?: Record<string, JustePrixGuess>;

  @prop()
  announceMessageId?: string;
}

const JustePrixStateModel = getModelForClass(JustePrixState, {
  schemaOptions: { collection: 'juste_prix_state', timestamps: true },
});

export type IJustePrixStateDoc = DocumentType<JustePrixState>;
export default JustePrixStateModel;
