import { BotClient } from '../../../../bot/client';
import { JustePrixCron } from './juste-prix.cron';

export class JustePrixCronManager {
  private cron: JustePrixCron;

  constructor(client: BotClient) {
    this.cron = new JustePrixCron(client);
  }

  public start(): void {
    this.cron.start();
  }

  public stop(): void {
    this.cron.stop();
  }
}
