import { CronJob } from 'cron';
import { Client } from 'discord.js';
import { BotClient } from '../../bot/client';
import { LogService } from '../logs/logs.service';

export class LogsDayCron {
  private job: CronJob;
  private client: Client;
  private readonly TZ = 'Europe/Paris';

  constructor(client: Client) {
    this.client = client;

    this.job = new CronJob(
      '0 0 0 * * *',
      this.sendSeparator.bind(this),
      null,
      false,
      this.TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(chalk.yellow('   ├─ 📋 Logs day') + chalk.gray(` • tous les jours à 00:00 ${this.TZ}`));
  }

  public stop(): void {
    this.job.stop();
  }

  private async sendSeparator(): Promise<void> {
    await LogService.sendDaySeparator();
  }
}
