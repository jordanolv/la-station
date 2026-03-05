import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { BotClient } from '../../../bot/client';
import { MountainSpawnCron } from './mountain-spawn.cron';

export class MountainCronManager extends BaseCronManager {
  private mountainSpawnCron: MountainSpawnCron;

  constructor(client: BotClient) {
    super(client, 'mountain');

    this.mountainSpawnCron = new MountainSpawnCron(client);
    this.addCron(this.mountainSpawnCron);
  }

  public getMountainSpawnCron(): MountainSpawnCron {
    return this.mountainSpawnCron;
  }
}
