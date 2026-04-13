import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { BotClient } from '../../../bot/client';
import { MountainSpawnCron } from './mountain-spawn.cron';
import { RaidCron } from './raid.cron';

export class MountainCronManager extends BaseCronManager {
  private mountainSpawnCron: MountainSpawnCron;
  private raidCron: RaidCron;

  constructor(client: BotClient) {
    super(client, 'mountain');

    this.mountainSpawnCron = new MountainSpawnCron(client);
    this.raidCron = new RaidCron(client);
    this.addCron(this.mountainSpawnCron);
    this.addCron(this.raidCron);
  }

  public getMountainSpawnCron(): MountainSpawnCron {
    return this.mountainSpawnCron;
  }
}
