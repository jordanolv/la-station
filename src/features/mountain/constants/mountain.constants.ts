import type { MountainRarity, RarityConfig } from '../types/mountain.types';

export const MOUNTAIN_REQUIRED_SECONDS = 2700; // 45 minutes en voc pour débloquer
export const MOUNTAIN_TICKET_SECONDS = 5400;   // 1h30 ticket par heure en voc
export const MOUNTAIN_LOCK_MIN_SECONDS = 180;  // 3 minutes min pour activer le lock de montagne
export const FRAGMENTS_PER_TICKET = 20;

export const SPAWN_MAX_PER_DAY = 2;
export const SPAWN_HOUR_START = 7;
export const SPAWN_HOUR_END = 23;

export const RARITY_CONFIG: Record<MountainRarity, RarityConfig> = {
  common:    { label: 'Commune',    emoji: '⬜', color: 0x95a5a6, fragmentsOnDuplicate: 1,  packWeight: 60 },
  rare:      { label: 'Rare',       emoji: '🟦', color: 0x3498db, fragmentsOnDuplicate: 3,  packWeight: 25 },
  epic:      { label: 'Épique',     emoji: '🟪', color: 0x9b59b6, fragmentsOnDuplicate: 8,  packWeight: 12 },
  legendary: { label: 'Légendaire', emoji: '🟨', color: 0xf1c40f, fragmentsOnDuplicate: 20, packWeight: 3  },
};
