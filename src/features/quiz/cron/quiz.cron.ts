import { CronJob } from 'cron';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { BotClient } from '../../../bot/client';
import { QuizService } from '../services/quiz.service';

const TZ = 'Europe/Paris';
const QUIZ_HOUR_START = 12;
const QUIZ_HOUR_END = 19;

export class QuizCron {
  private postJob: CronJob;
  private revealJob: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;

    // Planifie la question chaque jour à minuit
    this.postJob = new CronJob(
      '0 0 0 * * *',
      this.scheduleToday.bind(this),
      null,
      false,
      TZ,
    );

    // Révèle la question chaque jour à 19h
    this.revealJob = new CronJob(
      '0 0 19 * * *',
      this.revealActive.bind(this),
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
        chalk.gray(` • 1 question/jour, fenêtre ${QUIZ_HOUR_START}h-${QUIZ_HOUR_END}h, révélation ${QUIZ_HOUR_END}h`),
    );
    this.scheduleToday();
  }

  public stop(): void {
    this.postJob.stop();
    this.revealJob.stop();
  }

  private scheduleToday(): void {
    const nowParis = toZonedTime(new Date(), TZ);
    const year = nowParis.getFullYear();
    const month = nowParis.getMonth();
    const day = nowParis.getDate();

    const hourRange = QUIZ_HOUR_END - QUIZ_HOUR_START;
    const hour = QUIZ_HOUR_START + Math.floor(Math.random() * hourRange);
    const minute = Math.floor(Math.random() * 60);

    const naiveParis = new Date(year, month, day, hour, minute, 0);
    const targetUtc = fromZonedTime(naiveParis, TZ);

    const delay = targetUtc.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => QuizService.post(this.client), delay);
    }
  }

  private async revealActive(): Promise<void> {
    await QuizService.revealActive(this.client);
  }
}
