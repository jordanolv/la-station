import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class AvalancheState {
  /** Dernier jour (YYYY-MM-DD Paris) où planDay a tiré au sort — évite de re-tirer à chaque restart */
  @prop()
  lastPlanDate?: string;

  @prop()
  activeThreadId?: string;

  @prop()
  activeMessageId?: string;

  /** userId -> numéro choisi (1 numéro par joueur, modifiable jusqu'à la clôture) */
  @prop({ type: Object, default: {} })
  players?: Record<string, number>;

  @prop()
  registrationEndsAt?: Date;

  /** Horaires des éliminations, calculés à la clôture des inscriptions */
  @prop({ type: () => [Date], default: [] })
  eliminationTimes?: Date[];

  @prop({ type: () => [Number], default: [] })
  eliminatedNumbers?: number[];

  @prop()
  announceMessageId?: string;
}

const AvalancheStateModel = getModelForClass(AvalancheState, {
  schemaOptions: { collection: 'avalanche_state', timestamps: true },
});

export type IAvalancheStateDoc = DocumentType<AvalancheState>;
export default AvalancheStateModel;
