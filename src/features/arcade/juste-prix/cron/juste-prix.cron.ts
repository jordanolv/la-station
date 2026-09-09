import { CronJob } from 'cron';
import { BotClient } from '../../../../bot/client';
import { JustePrixService } from '../services/juste-prix.service';
import { JP_SPAWN_HOUR } from '../constants/juste-prix.constants';

const TZ = 'Europe/Paris';

export class JustePrixCron {
  private job: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
    this.job = new CronJob(
      '0 1 0 * * *',
      () => JustePrixService.planDay(this.client),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 💰 Juste Prix') +
        chalk.gray(
          ` • minuit ${TZ}, selon planning hebdo, lancement ${JP_SPAWN_HOUR}h, révélation 21h`,
        ),
    );
  }

  public stop(): void {
    this.job.stop();
  }
}
