import gamesConfig from '../config/lfm-games-config.json';

export interface GameModeOption {
  label: string;
  value: string;
  slots: number;
}

export interface TypeOption {
  label: string;
  value: string;
}

export interface RankOption {
  label: string;
  value: string;
}

export interface PartyModeField {
  type: 'player_count' | 'mode_select' | 'fixed_slots';
  label?: string;
  min?: number;
  max?: number;
  options?: GameModeOption[];
  slots?: number;
}

export interface GameConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  banner?: string;
  roleId?: string;
  partyModeField: PartyModeField;
  privateDefaultSlots?: number;
  typeOptions: TypeOption[];
  rankOptions: RankOption[];
}

export interface CustomGameConfig {
  enabled: boolean;
  label: string;
  value: string;
  defaultConfig: {
    partyModeField: PartyModeField;
    typeOptions: TypeOption[];
    rankOptions: RankOption[];
  };
}

export interface GamesConfig {
  games: GameConfig[];
  customGame: CustomGameConfig;
}

class LFMGamesConfigService {
  private config: GamesConfig;

  constructor() {
    this.config = gamesConfig as GamesConfig;
  }

  /**
   * Get all available games
   */
  getGames(): GameConfig[] {
    return this.config.games;
  }

  /**
   * Get a specific game config by ID or name
   */
  getGameConfig(gameIdOrName: string): GameConfig | null {
    return this.config.games.find(
      (game) => game.id === gameIdOrName || game.name === gameIdOrName
    ) || null;
  }

  /**
   * Get custom game config
   */
  getCustomGameConfig(): CustomGameConfig {
    return this.config.customGame;
  }

  /**
   * Check if custom games are enabled
   */
  isCustomGameEnabled(): boolean {
    return this.config.customGame.enabled;
  }

  /**
   * Get config for a custom game (uses default config)
   */
  getConfigForCustomGame(gameName: string): Partial<GameConfig> {
    return {
      id: 'custom',
      name: gameName,
      emoji: '🎮',
      color: '#5865F2',
      ...this.config.customGame.defaultConfig
    };
  }

  /**
   * Get type options for a game
   */
  getTypeOptions(gameIdOrName: string): TypeOption[] {
    const gameConfig = this.getGameConfig(gameIdOrName);
    return gameConfig ? gameConfig.typeOptions : this.config.customGame.defaultConfig.typeOptions;
  }

  /**
   * Get rank options for a game
   */
  getRankOptions(gameIdOrName: string): RankOption[] {
    const gameConfig = this.getGameConfig(gameIdOrName);
    return gameConfig ? gameConfig.rankOptions : this.config.customGame.defaultConfig.rankOptions;
  }

  /**
   * Get party mode field config for a game
   */
  getPartyModeField(gameIdOrName: string): PartyModeField {
    const gameConfig = this.getGameConfig(gameIdOrName);
    return gameConfig ? gameConfig.partyModeField : this.config.customGame.defaultConfig.partyModeField;
  }

  /**
   * Get color for a game
   */
  getGameColor(gameIdOrName: string): string {
    const gameConfig = this.getGameConfig(gameIdOrName);
    return gameConfig?.color || '#5865F2';
  }

  /**
   * Get banner for a game
   */
  getGameBanner(gameIdOrName: string): string | undefined {
    const gameConfig = this.getGameConfig(gameIdOrName);
    return gameConfig?.banner;
  }
}

export default new LFMGamesConfigService();
