import * as fs from 'fs';
import * as path from 'path';

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

  static get count(): number {
    return this.mountains.length;
  }
}
