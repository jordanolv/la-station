import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import { connectToDatabase, db } from '../../shared/db';
import { UserRepository } from '../../features/user/services/user.repository';
import { StatsService } from '../../features/stats/services/stats.service';

dotenv.config();

type DurationInput = {
  hours?: number;
  minutes?: number;
  seconds?: number;
  duration?: string; // accepte "5h30", "2:15:00", etc.
};

type VoiceImportEntry = DurationInput & {
  discordId: string;
  guildId: string;
  username?: string;
  date?: string; // facultatif : date à associer dans voiceHistory
};

function parseArgs(): { file: string } {
  const fileArg = process.argv.slice(2).find(arg => arg.startsWith('--file='));
  if (!fileArg) {
    console.error('Usage: npm run voice:import -- --file=./path/to/import.json');
    process.exit(1);
  }

  const file = fileArg.split('=').slice(1).join('=');
  return { file };
}

function toSeconds(entry: DurationInput): number {
  if (typeof entry.seconds === 'number') {
    return Math.floor(entry.seconds);
  }

  let total = 0;
  if (typeof entry.hours === 'number') {
    total += entry.hours * 3600;
  }
  if (typeof entry.minutes === 'number') {
    total += entry.minutes * 60;
  }

  if (total > 0) {
    return Math.floor(total);
  }

  if (entry.duration) {
    const duration = entry.duration.trim().toLowerCase();

    const hhmmss = duration.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (hhmmss) {
      const [, h, m, s] = hhmmss;
      const hours = parseInt(h, 10);
      const minutes = parseInt(m, 10);
      const seconds = s ? parseInt(s, 10) : 0;
      return hours * 3600 + minutes * 60 + seconds;
    }

    const regex = /([\d.,]+)\s*([hms])/g;
    let match: RegExpExecArray | null;
    let parsedSeconds = 0;
    while ((match = regex.exec(duration)) !== null) {
      const value = parseFloat(match[1].replace(',', '.'));
      const unit = match[2];
      if (Number.isNaN(value)) continue;

      if (unit === 'h') parsedSeconds += value * 3600;
      else if (unit === 'm') parsedSeconds += value * 60;
      else parsedSeconds += value;
    }

    if (parsedSeconds > 0) {
      return Math.round(parsedSeconds);
    }
  }

  return 0;
}

function normalizeDate(date?: string): Date {
  const base = date ? new Date(date) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Date invalide: ${date}`);
  }
  base.setHours(0, 0, 0, 0);
  return base;
}

async function importVoiceStats(entries: VoiceImportEntry[]): Promise<void> {
  const repo = new UserRepository();

  for (const entry of entries) {
    const seconds = toSeconds(entry);
    if (!entry.discordId || !entry.guildId) {
      console.warn(`[IGNORÉ] discordId ou guildId manquant: ${JSON.stringify(entry)}`);
      continue;
    }

    if (seconds <= 0) {
      console.warn(`[IGNORÉ] Durée nulle ou invalide pour ${entry.discordId}`);
      continue;
    }

    const date = normalizeDate(entry.date);

    const existing = await repo.findGuildUserById(entry.discordId, entry.guildId);
    const user = existing || await repo.createGuildUser({
      discordId: entry.discordId,
      name: entry.username || 'Unknown User',
      guildId: entry.guildId
    });

    if (entry.username && user.name !== entry.username) {
      user.name = entry.username;
    }

    const addedSeconds = StatsService.applyVoiceSegmentsToGuildUser(
      user,
      [{ date, seconds }],
      existing ? 'append' : 'replace'
    );

    if (existing) {
      user.stats.voiceTime += addedSeconds;
    } else {
      user.stats.voiceTime = addedSeconds;
    }

    user.infos.updatedAt = new Date();
    await user.save();

    console.log(`[OK] ${entry.guildId}/${entry.discordId} +${(addedSeconds / 3600).toFixed(2)}h (${addedSeconds}s)`);
  }
}

async function main() {
  const { file } = parseArgs();
  const absolutePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Fichier introuvable: ${absolutePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const entries = JSON.parse(raw) as VoiceImportEntry[];

  if (!Array.isArray(entries)) {
    console.error('Le JSON doit être un tableau d\'objets.');
    process.exit(1);
  }

  await connectToDatabase();

  try {
    await importVoiceStats(entries);
  } finally {
    await db.disconnect();
  }
}

main().catch(async (error) => {
  console.error('Erreur lors de l\'import:', error);
  try {
    await db.disconnect();
  } catch {}
  process.exit(1);
});
