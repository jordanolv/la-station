import type { MountainRarity, RarityConfig, RaidRarityConfig, PackTier, PackTierConfig } from '../types/peak-hunters.types';

export const MOUNTAIN_REQUIRED_SECONDS = 2700; // 45 minutes en voc pour débloquer
export const MOUNTAIN_TICKET_SECONDS = 5400;   // 1h30 ticket par heure en voc
export const MOUNTAIN_LOCK_MIN_SECONDS = 180;  // 3 minutes min pour activer le lock de montagne
export const FRAGMENTS_PER_TICKET = 20;

export const SPAWN_MAX_PER_DAY = 2;
export const SPAWN_HOUR_START = 7;
export const SPAWN_HOUR_END = 23;

export const RARITY_CONFIG: Record<MountainRarity, RarityConfig> = {
  common:    { label: 'Commune',    emoji: '<:iconcommon:1493887332019998780>', color: 0x95a5a6, fragmentsOnDuplicate: 1,  packWeight: 60 },
  rare:      { label: 'Rare',       emoji: '<:iconrare:1493887337644560554>', color: 0x3498db, fragmentsOnDuplicate: 3,  packWeight: 25 },
  epic:      { label: 'Épique',     emoji: '<:iconepic:1493887333248794686>', color: 0x9b59b6, fragmentsOnDuplicate: 8,  packWeight: 12 },
  legendary: { label: 'Légendaire', emoji: '<:iconleg:1493887335765512343>', color: 0xf1c40f, fragmentsOnDuplicate: 20, packWeight: 3  },
};

// ─── Tiers d'expédition ───────────────────────────────────────────────────────

export const PACK_TIER_CONFIG: Record<PackTier, PackTierConfig> = {
  sentier:  { label: 'Sentier',  emoji: '<:sentierTier:1493261306478858391>', color: 0xe67e22, description: 'Probabilités normales' },
  falaise:  { label: 'Falaise',  emoji: '<:falaiseTier:1493261308093792368>',  color: 0x3498db, description: 'Meilleures chances de rare et épique' },
  sommet:   { label: 'Sommet',   emoji: '<:sommetTier:1493261304742547556>', color: 0x9b59b6, description: 'Garantit une montagne Épique ou Légendaire' },
};

/** Poids de rareté par tier d'expédition */
export const PACK_TIER_RARITY_WEIGHTS: Record<PackTier, Record<MountainRarity, number>> = {
  sentier:  { common: 60, rare: 25, epic: 12, legendary: 3  },
  falaise:  { common: 40, rare: 35, epic: 20, legendary: 5  },
  sommet:   { common: 0,  rare: 10, epic: 65, legendary: 25 },
};

/** Probabilités de tier pour tout gain d'expédition (vocal, daily, quiz, raids) */
export const TICKET_TIER_CHANCES: { tier: PackTier; weight: number }[] = [
  { tier: 'sentier', weight: 80 },
  { tier: 'falaise', weight: 18 },
  { tier: 'sommet',  weight: 2  },
];

/** Tire un tier au hasard selon les poids donnés */
export function rollPackTier(chances: { tier: PackTier; weight: number }[]): PackTier {
  const total = chances.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  for (const { tier, weight } of chances) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return chances[0].tier;
}

// ─── Raid ─────────────────────────────────────────────────────────────────────

export const RAID_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const RAID_AVG_POINTS_FLOOR = 800;
export const RAID_MIN_CONTRIBUTION_RATIO = 0.3;
export const RAID_HP_BAR_LENGTH = 20;
export const RAID_SPAWN_CHANCE_PER_HOUR = 0.15;

export const RAID_RARITY_CONFIG: Record<Exclude<MountainRarity, 'common'>, RaidRarityConfig> = {
  rare:      { hpMultiplier: 3,  durationDaysMin: 4, durationDaysMax: 5, baseXp: 300,  baseCoins: 200  },
  epic:      { hpMultiplier: 7,  durationDaysMin: 5, durationDaysMax: 6, baseXp: 700,  baseCoins: 500  },
  legendary: { hpMultiplier: 15, durationDaysMin: 6, durationDaysMax: 7, baseXp: 1500, baseCoins: 1000 },
};
