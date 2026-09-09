import { prop, getModelForClass, DocumentType, index } from '@typegoose/typegoose';

export type ResultGame = 'bingo' | 'justePrix' | 'avalanche' | 'enigme';

/** Une ligne par place gagnante : 1 pour bingo/juste prix/avalanche, 1 à 3 pour le podium énigme. */
@index({ at: -1 })
@index({ userId: 1, at: -1 })
export class GameResult {
  @prop({ required: true })
  game!: ResultGame;

  @prop({ required: true })
  userId!: string;

  @prop({ required: true, default: 1 })
  rank!: number;

  @prop({ required: true, default: () => new Date() })
  at!: Date;

  /** Détails propres au jeu : coups, temps en ms, exact, nombre de joueurs… */
  @prop({ type: Object, default: {} })
  details?: Record<string, number | boolean | string>;
}

const GameResultModel = getModelForClass(GameResult, {
  schemaOptions: { collection: 'game_results' },
});

export type IGameResultDoc = DocumentType<GameResult>;
export default GameResultModel;
