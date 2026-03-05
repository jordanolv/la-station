export type MountainRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityConfig {
  label: string;
  emoji: string;
  color: number;
  /** Fragments donnés si la montagne est déjà débloquée (doublon) */
  fragmentsOnDuplicate: number;
  /** Poids pour le tirage de pack (total = 100) */
  packWeight: number;
}
