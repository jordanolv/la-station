import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import centroids from '../../../web/data/country-centroids.json';
import { MountainService } from './mountain.service';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';

const MAP_W = 1280;
const MAP_H = 640;

export const CONTINENT_BOUNDS = {
  monde:    { minLng: -180, maxLng: 180,  minLat: -75, maxLat: 85  },
  europe:   { minLng: -30,  maxLng: 50,   minLat: 34,  maxLat: 72  },
  afrique:  { minLng: -22,  maxLng: 55,   minLat: -36, maxLat: 40  },
  asie:     { minLng: 20,   maxLng: 155,  minLat: -15, maxLat: 78  },
  amerique: { minLng: -170, maxLng: -30,  minLat: -58, maxLat: 80  },
} as const;

export type Continent = keyof typeof CONTINENT_BOUNDS;
type Bounds = typeof CONTINENT_BOUNDS[Continent];

export interface CountryData {
  name: string;
  flag: string;
  owned: number;
  total: number;
  lat: number;
  lng: number;
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function lngToX(lng: number, b: Bounds): number {
  return ((lng - b.minLng) / (b.maxLng - b.minLng)) * MAP_W;
}

function latToY(lat: number, b: Bounds): number {
  return ((b.maxLat - lat) / (b.maxLat - b.minLat)) * MAP_H;
}

export class MapService {
  private static geojson: any = null;

  private static getGeoJSON(): any {
    if (!this.geojson) {
      const p = path.join(__dirname, '../../../web/public/countries.geojson');
      this.geojson = JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
    return this.geojson;
  }

  static getTotalCountryCount(): number {
    const seen = new Set<string>();
    for (const m of MountainService.getAll()) {
      for (const c of m.countries) seen.add(c);
    }
    return seen.size;
  }

  static async getCountriesForUser(userId: string): Promise<CountryData[]> {
    const unlocked = await UserMountainsRepository.getUnlocked(userId);
    const unlockedIds = new Set(unlocked.map(u => u.mountainId));
    const allWithCoords = MountainService.getAll().filter(m => m.lat != null && m.lng != null);

    const stats = new Map<string, { total: number; owned: number; flag: string }>();
    for (const m of allWithCoords) {
      for (let i = 0; i < m.countries.length; i++) {
        const country = m.countries[i];
        const entry = stats.get(country) ?? { total: 0, owned: 0, flag: m.flags[i] ?? '' };
        entry.total++;
        if (unlockedIds.has(m.id)) entry.owned++;
        stats.set(country, entry);
      }
    }

    const centroidsMap = centroids as Record<string, { lat: number; lng: number }>;
    return [...stats.entries()]
      .filter(([, { owned }]) => owned > 0)
      .map(([name, { total, owned, flag }]) => {
        const centroid = centroidsMap[name];
        const mts = allWithCoords.filter(m => m.countries.includes(name));
        const lat = centroid?.lat ?? mts.reduce((a, m) => a + m.lat!, 0) / mts.length;
        const lng = centroid?.lng ?? mts.reduce((a, m) => a + m.lng!, 0) / mts.length;
        return { name, flag, owned, total, lat, lng };
      });
  }

  static async generateStaticImage(countries: CountryData[], continent: Continent = 'monde'): Promise<Buffer> {
    const bounds = CONTINENT_BOUNDS[continent];
    const canvas = createCanvas(MAP_W, MAP_H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    const geojson = this.getGeoJSON();

    for (const feature of geojson.features) {
      const geom = feature.geometry;
      const polygons: number[][][][] = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

      for (const polygon of polygons) {
        ctx.beginPath();
        for (const ring of polygon) {
          for (let i = 0; i < ring.length; i++) {
            const x = lngToX(ring[i][0], bounds);
            const y = latToY(ring[i][1], bounds);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = continent === 'monde' ? 0.5 : 0.8;
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const c of countries) {
      const x = lngToX(c.lng, bounds);
      const y = latToY(c.lat, bounds);

      if (x < -20 || x > MAP_W + 20 || y < -20 || y > MAP_H + 20) continue;

      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 6;

      const fontSize = continent === 'monde' ? 11 : 13;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#e6edf3';
      ctx.fillText(stripAccents(c.name), x, y - 7);

      ctx.font = `${fontSize - 1}px sans-serif`;
      ctx.fillStyle = '#7d8fef';
      ctx.fillText(`${c.owned}/${c.total}`, x, y + 7);

      ctx.shadowBlur = 0;
    }

    return canvas.toBuffer('image/png');
  }
}
