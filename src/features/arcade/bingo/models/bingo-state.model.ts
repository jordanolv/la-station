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

  @prop({ type: () => [String], default: [] })
  activeGuessers?: string[];

  @prop({ type: () => [Number], default: [] })
  activeBonusNumbers?: number[];

  @prop()
  activeStartedAt?: Date;

  /** Message d'annonce dans le channel général, supprimé en fin de partie */
  @prop()
  announceMessageId?: string;

  /** Packs bonus accumulés par les bingos expirés sans gagnant */
  @prop({ default: 0 })
  jackpotBonus?: number;
}

const BingoStateModel = getModelForClass(BingoState, {
  schemaOptions: { collection: 'bingo_state', timestamps: true },
});

export type IBingoState = BingoState;
export type IBingoStateDoc = DocumentType<BingoState>;
export default BingoStateModel;
