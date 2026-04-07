import { CronJob } from 'cron';
import { BotClient } from '../../../bot/client';
import { QuizService } from '../services/quiz.service';

const TZ = 'Europe/Paris';

export class QuizCron {
  private postJob: CronJob;
  private revealJob: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;

    this.postJob = new CronJob(
      '0 0 13 * * *',
      () => QuizService.post(this.client),
      null,
      false,
      TZ,
    );

    this.revealJob = new CronJob(
      '0 0 19 * * *',
      () => QuizService.revealActive(this.client),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.postJob.start();
    this.revealJob.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ ❓ Quiz') +
        chalk.gray(` • 1 question/jour à 13h, révélation 19h`),
    );
  }

  public stop(): void {
    this.postJob.stop();
    this.revealJob.stop();
  }
}
