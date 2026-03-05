import * as fs from 'fs';
import * as path from 'path';
import type { MountainRarity } from '../types/mountain.types';
import { RARITY_CONFIG } from '../constants/mountain.constants';

export interface MountainInfo {
  id: string;
  name: string;
  description: string;
  altitude: string;
  image: string;
  wiki: string;
}

export class MountainService {
  private static mountains: MountainInfo[] = [];

  static {
    MountainService.loadMountains();
  }

  static loadMountains(): void {
    try {
      const filePath = path.join(__dirname, '../data/mountains.json');
      this.mountains = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`[MountainService] ${this.mountains.length} montagnes chargées`);
    } catch (err) {
      console.error('[MountainService] Erreur chargement mountains.json:', err);
      this.mountains = [];
    }
  }

  static getAll(): MountainInfo[] {
    return [...this.mountains];
  }

  static getById(id: string): MountainInfo | undefined {
    return this.mountains.find(m => m.id === id);
  }

  static getRandom(): MountainInfo | null {
    if (this.mountains.length === 0) return null;
    return this.mountains[Math.floor(Math.random() * this.mountains.length)];
  }

  /** Parse l'altitude en mètres depuis le string (ex: "4 808 m" → 4808) */
  static parseAltitudeMeters(altitudeStr: string): number {
    const cleaned = altitudeStr.replace(/\s/g, '').replace(',', '.').replace('m', '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  static getRarity(mountain: MountainInfo): MountainRarity {
    const alt = this.parseAltitudeMeters(mountain.altitude);
    if (alt >= 8091) return 'legendary';
    if (alt >= 6500) return 'epic';
    if (alt >= 4100) return 'rare';
    return 'common';
  }

  /** Tire une montagne au hasard pondérée par les poids de rareté du pack */
  static getRandomByPackWeight(): MountainInfo | null {
    if (this.mountains.length === 0) return null;

    const totalWeight = Object.values(RARITY_CONFIG).reduce((acc, r) => acc + r.packWeight, 0);
    let roll = Math.random() * totalWeight;

    const rarityOrder: MountainRarity[] = ['common', 'rare', 'epic', 'legendary'];
    let targetRarity: MountainRarity = 'common';
    for (const rarity of rarityOrder) {
      roll -= RARITY_CONFIG[rarity].packWeight;
      if (roll <= 0) {
        targetRarity = rarity;
        break;
      }
    }

    const pool = this.mountains.filter(m => this.getRarity(m) === targetRarity);
    if (pool.length === 0) return this.getRandom();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  static get count(): number {
    return this.mountains.length;
  }
}
