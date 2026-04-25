import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { BotClient } from '../../../bot/client';
import { SpawnCron } from './spawn.cron';
import { RaidCron } from './raid.cron';
import { DailyMountainCron } from './daily-mountain.cron';

export class PeakHuntersCronManager extends BaseCronManager {
  private spawnCron: SpawnCron;
  private raidCron: RaidCron;
  private dailyMountainCron: DailyMountainCron;

  constructor(client: BotClient) {
    super(client, 'peak-hunters');

    this.spawnCron = new SpawnCron(client);
    this.raidCron = new RaidCron(client);
    this.dailyMountainCron = new DailyMountainCron();
    this.addCron(this.spawnCron);
    this.addCron(this.raidCron);
    this.addCron(this.dailyMountainCron);
  }

  public getSpawnCron(): SpawnCron {
    return this.spawnCron;
  }
}
