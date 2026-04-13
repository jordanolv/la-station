import { CronJob } from 'cron';

import { BotClient } from '../../../bot/client';
import { MountainSpawnService } from '../services/mountain-spawn.service';
import { SPAWN_MAX_PER_DAY, SPAWN_HOUR_START, SPAWN_HOUR_END } from '../constants/mountain.constants';
import { MountainConfigRepository } from '../repositories/mountain-config.repository';
import { LogService } from '../../../shared/logs/logs.service';
import { generateSpawnDates } from '../utils/spawn-date.utils';

const TZ = 'Europe/Paris';
const CRON_EXPRESSION = '0 0 0 * * *'; // minuit Paris

export class MountainSpawnCron {
  private job: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;

    this.job = new CronJob(
      CRON_EXPRESSION,
      this.planDay.bind(this),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 🌄 Mountain Spawn') +
        chalk.gray(` • minuit ${TZ}, max ${SPAWN_MAX_PER_DAY} spawn(s)/jour, fenêtre ${SPAWN_HOUR_START}h-${SPAWN_HOUR_END}h`),
    );
    // La réhydratation est gérée par MountainSpawnService.rehydrate() dans ready.ts
  }

  public stop(): void {
    this.job.stop();
  }

  private async planDay(): Promise<void> {
    // Vérifie qu'un schedule n'a pas déjà été posé (ex: reboot à minuit pile)
    const config = await MountainConfigRepository.get();
    const now = Date.now();
    const todayStart = (() => {
      const { toZonedTime } = require('date-fns-tz');
      const p = toZonedTime(new Date(), TZ);
      return new Date(p.getFullYear(), p.getMonth(), p.getDate(), 0, 0, 0).getTime();
    })();
    const alreadyScheduled = (config?.spawnSchedule ?? [])
      .map((d: Date) => new Date(d).getTime())
      .some((t: number) => t >= todayStart && t > now);

    if (alreadyScheduled) return;

    const count = Math.floor(Math.random() * (SPAWN_MAX_PER_DAY + 1));
    const dates = generateSpawnDates(count);

    await MountainConfigRepository.setSpawnSchedule(dates);
    this.scheduleFromDates(dates);

    LogService.info(
            `**${dates.length}** spawn(s) programmé(s) (fenêtre ${SPAWN_HOUR_START}h-${SPAWN_HOUR_END}h Paris)`,
      { feature: '⛰️ Mountain Spawn', title: '🗓️ Planification du jour' },
    ).catch(() => {});
  }

  private scheduleFromDates(dates: Date[]): void {
    const now = Date.now();
    for (const date of dates) {
      const delay = date.getTime() - now;
      if (delay > 0) {
        setTimeout(() => MountainSpawnService.doSpawn(this.client), delay);
      }
    }
  }
}
