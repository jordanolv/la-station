import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { EXPEDITION_TIER_CHANCES, EXPEDITION_TIER_CONFIG, rollExpeditionTier } from '../constants/peak-hunters.constants';
import type { ExpeditionTier } from '../types/peak-hunters.types';

export interface ExpeditionAwardResult {
  tiers: ExpeditionTier[];
  summary: string;
}

/**
 * Attribue N expéditions à un utilisateur en tirant leur tier aléatoirement.
 * Point d'entrée unique pour tout gain d'expédition externe à la feature.
 */
export async function awardExpeditions(userId: string, count: number): Promise<ExpeditionAwardResult> {
  const tiers: ExpeditionTier[] = [];
  for (let i = 0; i < count; i++) {
    const tier = rollExpeditionTier(EXPEDITION_TIER_CHANCES);
    tiers.push(tier);
    await UserMountainsRepository.addExpeditions(userId, 1, tier);
  }
  return { tiers, summary: tiers.map(t => EXPEDITION_TIER_CONFIG[t].emoji).join('') };
}

/** Ligne avec emotes custom — pour TextDisplay (Components V2) */
export function formatExpeditionsLine(sentier: number, falaise: number, sommet: number): string {
  return [
    `${EXPEDITION_TIER_CONFIG.sentier.emoji} **${sentier}**`,
    `${EXPEDITION_TIER_CONFIG.falaise.emoji} **${falaise}**`,
    `${EXPEDITION_TIER_CONFIG.sommet.emoji} **${sommet}**`,
  ].join('  ');
}

/** Ligne sans emotes custom — pour footer d'embed */
export function formatExpeditionsLineText(sentier: number, falaise: number, sommet: number): string {
  return [
    `${EXPEDITION_TIER_CONFIG.sentier.label}: ${sentier}`,
    `${EXPEDITION_TIER_CONFIG.falaise.label}: ${falaise}`,
    `${EXPEDITION_TIER_CONFIG.sommet.label}: ${sommet}`,
  ].join('  ·  ');
}
