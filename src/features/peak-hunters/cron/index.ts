import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { BotClient } from '../../../bot/client';
import { SpawnCron } from './spawn.cron';
import { RaidCron } from './raid.cron';

export class PeakHuntersCronManager extends BaseCronManager {
  private spawnCron: SpawnCron;
  private raidCron: RaidCron;

  constructor(client: BotClient) {
    super(client, 'peak-hunters');

    this.spawnCron = new SpawnCron(client);
    this.raidCron = new RaidCron(client);
    this.addCron(this.spawnCron);
    this.addCron(this.raidCron);
  }

  public getSpawnCron(): SpawnCron {
    return this.spawnCron;
  }
}
