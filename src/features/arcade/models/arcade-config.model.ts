import { prop } from '@typegoose/typegoose';

class ArcadeGameStats {
  @prop({ default: 0 })
  totalGames!: number;
}

class GameConfig {
  @prop({ default: true })
  enabled!: boolean;

  @prop({ type: () => ArcadeGameStats, default: () => ({ totalGames: 0 }) })
  stats!: ArcadeGameStats;
}

export class ArcadeConfig {
  @prop({ type: () => GameConfig, default: () => ({ enabled: true, stats: { totalGames: 0 } }) })
  shifumi!: GameConfig;

  @prop({ type: () => GameConfig, default: () => ({ enabled: true, stats: { totalGames: 0 } }) })
  puissance4!: GameConfig;

  @prop({ type: () => GameConfig, default: () => ({ enabled: true, stats: { totalGames: 0 } }) })
  morpion!: GameConfig;

  @prop({ type: () => GameConfig, default: () => ({ enabled: true, stats: { totalGames: 0 } }) })
  battle!: GameConfig;
}
