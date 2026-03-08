import { CronJob } from 'cron';
import { toZonedTime } from 'date-fns-tz';
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
    this.resumeOrPlanToday().catch(() => {});
  }

  private async resumeOrPlanToday(): Promise<void> {
    const config = await MountainConfigRepository.get();
    const schedule = config?.spawnSchedule ?? [];
    const nowParis = toZonedTime(new Date(), TZ);
    const todayStart = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate(), 0, 0, 0);

    const todayDates = schedule.map((d) => new Date(d)).filter((d) => d >= todayStart);

    if (todayDates.length === 0) {
      await this.planDay();
    } else {
      const remaining = todayDates.filter((d) => d.getTime() > Date.now());
      this.scheduleFromDates(remaining);
    }
  }

  public stop(): void {
    this.job.stop();
  }

  private async planDay(): Promise<void> {
    const count = Math.floor(Math.random() * (SPAWN_MAX_PER_DAY + 1));
    const dates = generateSpawnDates(count);

    await MountainConfigRepository.setSpawnSchedule(dates);
    this.scheduleFromDates(dates);

    LogService.info(
      this.client,
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
