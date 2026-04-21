import { BotClient } from '../../../../bot/client';
import { BingoCron } from './bingo.cron';

export class BingoCronManager {
  private bingoCron: BingoCron;

  constructor(client: BotClient) {
    this.bingoCron = new BingoCron(client);
  }

  public start(): void {
    this.bingoCron.start();
  }

  public stop(): void {
    this.bingoCron.stop();
  }
}
