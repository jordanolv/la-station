import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { TICKET_TIER_CHANCES, PACK_TIER_CONFIG, rollPackTier } from '../constants/peak-hunters.constants';
import type { PackTier } from '../types/peak-hunters.types';

export interface PackAwardResult {
  tiers: PackTier[];
  /** Résumé visuel : ex. "🎟️🎫💜" */
  summary: string;
}

/**
 * Attribue N tickets à un utilisateur en tirant leur tier aléatoirement.
 * Point d'entrée unique pour tout gain de ticket externe à la feature mountain.
 */
export async function awardExpeditions(userId: string, count: number): Promise<PackAwardResult> {
  const tiers: PackTier[] = [];
  for (let i = 0; i < count; i++) {
    const tier = rollPackTier(TICKET_TIER_CHANCES);
    tiers.push(tier);
    await UserMountainsRepository.addTickets(userId, 1, tier);
  }
  return { tiers, summary: tiers.map(t => PACK_TIER_CONFIG[t].emoji).join('') };
}

/** Ligne avec emotes custom — pour TextDisplay (Components V2) */
export function formatExpeditionsLine(sentierTickets: number, falaiseTickets: number, sommetTickets: number): string {
  return [
    `${PACK_TIER_CONFIG.sentier.emoji} **${sentierTickets}**`,
    `${PACK_TIER_CONFIG.falaise.emoji} **${falaiseTickets}**`,
    `${PACK_TIER_CONFIG.sommet.emoji} **${sommetTickets}**`,
  ].join('  ');
}

/** Ligne sans emotes custom — pour footer d'embed */
export function formatExpeditionsLineText(sentierTickets: number, falaiseTickets: number, sommetTickets: number): string {
  return [
    `${PACK_TIER_CONFIG.sentier.label}: ${sentierTickets}`,
    `${PACK_TIER_CONFIG.falaise.label}: ${falaiseTickets}`,
    `${PACK_TIER_CONFIG.sommet.label}: ${sommetTickets}`,
  ].join('  ·  ');
}
