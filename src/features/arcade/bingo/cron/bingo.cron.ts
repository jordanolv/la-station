import { CronJob } from 'cron';
import { BotClient } from '../../../../bot/client';
import { BingoService } from '../services/bingo.service';
import {
  BINGO_HOUR_END,
  BINGO_HOUR_START,
  BINGO_SPAWN_CHANCE,
} from '../constants/bingo.constants';

const TZ = 'Europe/Paris';
const CRON_EXPRESSION = '0 0 0 * * *';

export class BingoCron {
  private job: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
    this.job = new CronJob(
      CRON_EXPRESSION,
      () => BingoService.planDay(this.client),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 🎯 Bingo') +
        chalk.gray(
          ` • minuit ${TZ}, ${Math.round(BINGO_SPAWN_CHANCE * 100)}% chance/jour, fenêtre ${BINGO_HOUR_START}h-${BINGO_HOUR_END}h`,
        ),
    );
  }

  public stop(): void {
    this.job.stop();
  }
}
