import { BotClient } from '../../../../bot/client';
import { AvalancheCron } from './avalanche.cron';

export class AvalancheCronManager {
  private cron: AvalancheCron;

  constructor(client: BotClient) {
    this.cron = new AvalancheCron(client);
  }

  public start(): void {
    this.cron.start();
  }

  public stop(): void {
    this.cron.stop();
  }
}
