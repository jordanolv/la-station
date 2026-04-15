import * as fs from 'fs';
import * as path from 'path';
import type { MountainRarity, PackTier } from '../types/peak-hunters.types';
import { RARITY_CONFIG, PACK_TIER_RARITY_WEIGHTS } from '../constants/peak-hunters.constants';

export interface MountainInfo {
  id: string;
  mountainLabel: string;
  elevation: string;
  countries: string[];
  flags: string[];
  image: string;
  article: string;
  rarity: MountainRarity;
  lat?: number;
  lng?: number;
}

export class MountainService {
  private static mountains: MountainInfo[] = [];

  static {
    MountainService.loadMountains();
  }

  static loadMountains(): void {
    try {
      const filePath = path.join(__dirname, '../data/mountains.json');
      const raw: Omit<MountainInfo, 'id'>[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      this.mountains = raw.map(m => ({
        ...m,
        id: m.article.split('/wiki/')[1] ?? m.mountainLabel,
      }));
      console.log(`[MountainService] ${this.mountains.length} montagnes chargées`);
    } catch (err) {
      console.error('[MountainService] Erreur chargement mountains.json:', err);
      this.mountains = [];
    }
  }

  static getAltitude(mountain: MountainInfo): string {
    return Math.round(parseFloat(mountain.elevation)).toLocaleString('fr-FR') + ' m';
  }

  static getCountryDisplay(mountain: MountainInfo): string {
    return mountain.flags.map((f, i) => `${f} ${mountain.countries[i]}`).join('  ·  ');
  }

  static getAll(): MountainInfo[] {
    return [...this.mountains];
  }

  static getById(id: string): MountainInfo | undefined {
    const normalized = decodeURIComponent(id).replace(/_/g, ' ');
    return this.mountains.find(m =>
      m.id === id ||
      decodeURIComponent(m.id).replace(/_/g, ' ') === normalized,
    );
  }

  static getRandom(): MountainInfo | null {
    if (this.mountains.length === 0) return null;
    return this.mountains[Math.floor(Math.random() * this.mountains.length)];
  }

  static getRarity(mountain: MountainInfo): MountainRarity {
    return mountain.rarity;
  }

  /** Tire une montagne au hasard pondérée par les poids de rareté du pack standard */
  static getRandomByPackWeight(): MountainInfo | null {
    return this.getRandomByTier('sentier');
  }

  /** Tire une montagne au hasard selon le tier de pack */
  static getRandomByTier(tier: PackTier): MountainInfo | null {
    if (this.mountains.length === 0) return null;

    const weights = PACK_TIER_RARITY_WEIGHTS[tier];
    const totalWeight = Object.values(weights).reduce((acc, w) => acc + w, 0);
    let roll = Math.random() * totalWeight;

    const rarityOrder: MountainRarity[] = ['common', 'rare', 'epic', 'legendary'];
    let targetRarity: MountainRarity = 'common';
    for (const rarity of rarityOrder) {
      roll -= weights[rarity];
      if (roll <= 0) {
        targetRarity = rarity;
        break;
      }
    }

    const pool = this.mountains.filter(m => m.rarity === targetRarity);
    if (pool.length === 0) return this.getRandom();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  static get count(): number {
    return this.mountains.length;
  }
}
