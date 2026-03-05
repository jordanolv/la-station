import { CronJob } from 'cron';
import { BotClient } from '../../../bot/client';
import { MountainSpawnService } from '../services/mountain-spawn.service';
import { SPAWN_MAX_PER_DAY, SPAWN_HOUR_START, SPAWN_HOUR_END } from '../constants/mountain.constants';
import { MountainConfigRepository } from '../repositories/mountain-config.repository';
import { LogService } from '../../../shared/logs/logs.service';

const TZ = 'Europe/Paris';
const CRON_EXPRESSION = '0 0 0 * * *'; // minuit

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
  }

  public stop(): void {
    this.job.stop();
  }

  private async planDay(): Promise<void> {
    const count = Math.floor(Math.random() * (SPAWN_MAX_PER_DAY + 1));
    const now = new Date();
    const dates: Date[] = [];

    for (let i = 0; i < count; i++) {
      const totalMinutes =
        SPAWN_HOUR_START * 60 +
        Math.floor(Math.random() * (SPAWN_HOUR_END - SPAWN_HOUR_START) * 60);
      const target = new Date(now);
      target.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, Math.floor(Math.random() * 60), 0);
      dates.push(target);
    }

    await MountainConfigRepository.setSpawnSchedule(dates);
    this.scheduleFromDates(dates);

    LogService.info(
      this.client,
      `**${dates.length}** spawn(s) programmé(s) (fenêtre ${SPAWN_HOUR_START}h-${SPAWN_HOUR_END}h)`,
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
