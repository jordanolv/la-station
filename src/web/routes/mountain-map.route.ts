import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserMountainsRepository } from '../../features/mountain/repositories/user-mountains.repository';
import { MountainService } from '../../features/mountain/services/mountain.service';
import { RARITY_CONFIG } from '../../features/mountain/constants/mountain.constants';
import centroids from '../data/country-centroids.json';

const router = Router();

function getSecret(): string {
  const s = process.env.WEB_JWT_SECRET;
  if (!s) throw new Error('WEB_JWT_SECRET manquant');
  return s;
}

router.get('/api/map/mountains', async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token) { res.status(400).json({ error: 'Token manquant' }); return; }

  let userId: string;
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: string };
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' }); return;
  }

  const unlocked = await UserMountainsRepository.getUnlocked(userId);

  const withCoords = unlocked
    .map(u => MountainService.getById(u.mountainId))
    .filter((m): m is NonNullable<typeof m> & { lat: number; lng: number } => m != null && m.lat != null && m.lng != null);

  const mountains = withCoords.map(m => ({
    label: m.mountainLabel,
    lat: m.lat,
    lng: m.lng,
    altitude: MountainService.getAltitude(m),
    rarity: m.rarity,
    color: '#' + RARITY_CONFIG[m.rarity].color.toString(16).padStart(6, '0'),
    emoji: RARITY_CONFIG[m.rarity].emoji,
    rarityLabel: RARITY_CONFIG[m.rarity].label,
    countries: m.countries,
    article: m.article,
  }));

  // Centroïde et total par pays : calculés sur TOUTES les montagnes (pas seulement possédées)
  const allWithCoords = MountainService.getAll().filter(
    (m): m is typeof m & { lat: number; lng: number } => m.lat != null && m.lng != null,
  );

  const countryStats = new Map<string, { lats: number[]; lngs: number[]; total: number; owned: number }>();
  for (const m of allWithCoords) {
    for (const country of m.countries) {
      const entry = countryStats.get(country) ?? { lats: [], lngs: [], total: 0, owned: 0 };
      entry.lats.push(m.lat);
      entry.lngs.push(m.lng);
      entry.total++;
      countryStats.set(country, entry);
    }
  }

  // Incrémente le compte des possédées
  for (const m of withCoords) {
    for (const country of m.countries) {
      const entry = countryStats.get(country);
      if (entry) entry.owned++;
    }
  }

  const centroidsMap = centroids as Record<string, { lat: number; lng: number }>;

  // Seulement les pays où l'user a au moins une montagne
  const countries = [...countryStats.entries()]
    .filter(([, { owned }]) => owned > 0)
    .map(([name, { lats, lngs, total, owned }]) => {
      const centroid = centroidsMap[name];
      return {
        name,
        owned,
        total,
        lat: centroid?.lat ?? lats.reduce((a, b) => a + b, 0) / lats.length,
        lng: centroid?.lng ?? lngs.reduce((a, b) => a + b, 0) / lngs.length,
      };
    });

  res.json({ mountains, countries, unlockedCount: unlocked.length, total: MountainService.count });
});

export default router;
