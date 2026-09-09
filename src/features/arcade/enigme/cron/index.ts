import { BotClient } from '../../../../bot/client';
import { EnigmeCron } from './enigme.cron';

export class EnigmeCronManager {
  private cron: EnigmeCron;

  constructor(client: BotClient) {
    this.cron = new EnigmeCron(client);
  }

  public start(): void {
    this.cron.start();
  }

  public stop(): void {
    this.cron.stop();
  }
}
