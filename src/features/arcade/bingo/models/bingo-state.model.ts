import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class BingoState {
  @prop()
  nextSpawnAt?: Date;

  @prop()
  activeChannelId?: string;

  @prop()
  activeMessageId?: string;

  @prop()
  activeThreadId?: string;

  @prop()
  activeTarget?: number;

  @prop()
  activeLastGuesserId?: string;

  @prop({ type: () => [Number], default: [] })
  activeGuesses?: number[];

  @prop()
  activeStartedAt?: Date;
}

const BingoStateModel = getModelForClass(BingoState, {
  schemaOptions: { collection: 'bingo_state', timestamps: true },
});

export type IBingoState = BingoState;
export type IBingoStateDoc = DocumentType<BingoState>;
export default BingoStateModel;
