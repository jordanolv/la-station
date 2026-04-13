import { CronJob } from 'cron';
import { BotClient } from '../../../bot/client';
import { RaidService } from '../services/raid.service';

const TZ = 'Europe/Paris';

export class RaidCron {
  private job: CronJob;

  constructor(client: BotClient) {
    this.job = new CronJob(
      '0 */15 * * * *',
      () => this.tick(client),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(chalk.yellow('   ├─ ⚔️  Raid') + chalk.gray(' • toutes les 15min'));
  }

  public stop(): void {
    this.job.stop();
  }

  private async tick(client: BotClient): Promise<void> {
    await RaidService.updateProgressEmbed(client).catch(() => {});
    await RaidService.checkAndFinalize(client).catch(() => {});

    const minute = new Date().getMinutes();
    if (minute === 0) {
      await RaidService.trySpawnRaid(client).catch(() => {});
    }
  }
}
