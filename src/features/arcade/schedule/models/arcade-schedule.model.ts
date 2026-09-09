import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export type ScheduledGame = 'bingo' | 'justePrix' | 'avalanche' | 'enigme';

export class ArcadeSchedule {
  /** Lundi de la semaine (YYYY-MM-DD Paris) */
  @prop({ required: true, unique: true })
  weekKey!: string;

  /** YYYY-MM-DD → jeu du jour */
  @prop({ type: Object, required: true })
  days!: Record<string, ScheduledGame>;

  @prop()
  announceMessageId?: string;

  @prop()
  announceChannelId?: string;
}

const ArcadeScheduleModel = getModelForClass(ArcadeSchedule, {
  schemaOptions: { collection: 'arcade_schedule', timestamps: true },
});

export type IArcadeScheduleDoc = DocumentType<ArcadeSchedule>;
export default ArcadeScheduleModel;
