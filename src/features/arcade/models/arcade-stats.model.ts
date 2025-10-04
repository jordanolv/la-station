import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

class GlobalGameStats {
  @prop({ default: 0 })
  totalGames!: number;
}

export class ArcadeGlobalStats {
  @prop({ required: true, unique: true })
  game!: 'shifumi' | 'puissance4' | 'morpion';

  @prop({ type: () => GlobalGameStats, default: () => ({ totalGames: 0 }) })
  stats!: GlobalGameStats;
}

const ArcadeGlobalStatsModel = getModelForClass(ArcadeGlobalStats, {
  schemaOptions: {
    timestamps: true,
    collection: 'arcade_global_stats'
  }
});

export type IArcadeGlobalStats = DocumentType<ArcadeGlobalStats>;
export default ArcadeGlobalStatsModel;
