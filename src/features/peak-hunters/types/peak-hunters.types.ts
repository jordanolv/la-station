export type MountainRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PackTier = 'sentier' | 'falaise' | 'sommet';

export interface RarityConfig {
  label: string;
  emoji: string;
  color: number;
  /** Fragments donnés si la montagne est déjà débloquée (doublon) */
  fragmentsOnDuplicate: number;
  /** Poids pour le tirage de pack standard (total = 100) */
  packWeight: number;
}

export interface PackTierConfig {
  label: string;
  emoji: string;
  color: number;
  description: string;
}

export interface RaidRarityConfig {
  hpMultiplier: number;
  durationDaysMin: number;
  durationDaysMax: number;
  baseXp: number;
  baseCoins: number;
}
