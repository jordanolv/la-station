import { toParisDayYMD } from '../../../shared/time/day-split';
import { PeakHuntersConfigRepository } from '../repositories/peak-hunters-config.repository';
import { MountainService, type MountainInfo } from './mountain.service';

/**
 * Source de vérité pour la montagne du jour.
 *
 * - Une seule montagne par jour (timezone Paris), pondérée par rareté.
 * - Tous les channels créés aujourd'hui partagent cette montagne.
 * - L'utilisateur la débloque en cumulant ≥ 60 min de voc sur la journée.
 * - Le cron à minuit Paris pick la montagne du lendemain.
 * - Si le bot démarre et que la montagne persistée est absente/obsolète, une nouvelle est pick au boot.
 */
export class DailyMountainService {
  private static cached: { date: string; mountain: MountainInfo } | null = null;

  static async init(): Promise<void> {
    const today = toParisDayYMD(new Date());
    const stored = await PeakHuntersConfigRepository.getDailyMountain();

    if (stored && stored.date === today) {
      const mountain = MountainService.getById(stored.mountainId);
      if (mountain) {
        this.cached = { date: today, mountain };
        return;
      }
    }

    await this.pickAndPersistFor(today);
  }

  static async pickForToday(): Promise<MountainInfo | null> {
    const today = toParisDayYMD(new Date());
    return this.pickAndPersistFor(today);
  }

  private static async pickAndPersistFor(date: string): Promise<MountainInfo | null> {
    const mountain = MountainService.getRandomWeighted();
    if (!mountain) return null;
    this.cached = { date, mountain };
    await PeakHuntersConfigRepository.setDailyMountain(date, mountain.id);
    return mountain;
  }

  static getTodayMountain(): MountainInfo | null {
    const today = toParisDayYMD(new Date());
    if (!this.cached || this.cached.date !== today) return null;
    return this.cached.mountain;
  }
}
