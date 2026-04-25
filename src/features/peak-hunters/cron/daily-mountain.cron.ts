import { CronJob } from 'cron';
import { DailyMountainService } from '../services/daily-mountain.service';
import { LogService } from '../../../shared/logs/logs.service';
import { MountainService } from '../services/mountain.service';
import { RARITY_CONFIG } from '../constants/peak-hunters.constants';

const TZ = 'Europe/Paris';
const CRON_EXPRESSION = '0 0 0 * * *';

export class DailyMountainCron {
  private job: CronJob;

  constructor() {
    this.job = new CronJob(CRON_EXPRESSION, this.run.bind(this), null, false, TZ);
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 🗓️ Daily Mountain') + chalk.gray(` • minuit ${TZ}`),
    );
  }

  public stop(): void {
    this.job.stop();
  }

  private async run(): Promise<void> {
    const mountain = await DailyMountainService.pickForToday();
    if (!mountain) return;

    const rarity = MountainService.getRarity(mountain);
    const { emoji, label } = RARITY_CONFIG[rarity];
    LogService.info(
      `Montagne du jour : **${mountain.mountainLabel}** ${emoji} ${label}`,
      { feature: '⛰️ Daily Mountain', title: '🗓️ Nouvelle montagne du jour' },
    ).catch(() => {});
  }
}
