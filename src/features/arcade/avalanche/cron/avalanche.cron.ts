import { CronJob } from 'cron';
import { BotClient } from '../../../../bot/client';
import { AvalancheService } from '../services/avalanche.service';
import {
  AVALANCHE_ELIMINATION_END_HOUR,
  AVALANCHE_REGISTRATION_END_HOUR,
  AVALANCHE_SPAWN_CHANCE,
} from '../constants/avalanche.constants';

const TZ = 'Europe/Paris';

export class AvalancheCron {
  private job: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
    this.job = new CronJob(
      '0 1 0 * * *',
      () => AvalancheService.planDay(this.client),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 🏔️ Avalanche') +
        chalk.gray(
          ` • minuit ${TZ}, ${Math.round(AVALANCHE_SPAWN_CHANCE * 100)}% chance/jour, inscriptions jusqu'à ${AVALANCHE_REGISTRATION_END_HOUR}h, fin ${AVALANCHE_ELIMINATION_END_HOUR}h`,
        ),
    );
  }

  public stop(): void {
    this.job.stop();
  }
}
