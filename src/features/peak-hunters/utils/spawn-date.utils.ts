import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SPAWN_HOUR_START, SPAWN_HOUR_END } from '../constants/peak-hunters.constants';

const TZ = 'Europe/Paris';

/**
 * Génère des dates de spawn aléatoires dans la fenêtre [SPAWN_HOUR_START, SPAWN_HOUR_END]
 * en heure Paris (indépendant du fuseau du serveur).
 *
 * @param count Nombre de dates à générer
 * @returns Dates triées par ordre chronologique (timestamps UTC)
 */
export function generateSpawnDates(count: number): Date[] {
  const nowParis = toZonedTime(new Date(), TZ);
  const year = nowParis.getFullYear();
  const month = nowParis.getMonth();
  const day = nowParis.getDate();

  const hourRange = SPAWN_HOUR_END - SPAWN_HOUR_START;
  const dates: Date[] = [];

  for (let i = 0; i < count; i++) {
    const hour = SPAWN_HOUR_START + Math.floor(Math.random() * (hourRange + 1));
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);

    const naiveParis = new Date(year, month, day, hour, minute, second);
    const targetUtc = fromZonedTime(naiveParis, TZ);
    dates.push(targetUtc);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}
