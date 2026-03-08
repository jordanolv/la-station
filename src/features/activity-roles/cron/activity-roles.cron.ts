import { CronJob } from 'cron';
import { BotClient } from '../../../bot/client';
import { ActivityRolesService } from '../services/activity-roles.service';

const TZ = 'Europe/Paris';
const CRON_EXPRESSION = '0 0 0 * * 1'; // lundi minuit Paris

export class ActivityRolesCron {
  private job: CronJob;
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;

    this.job = new CronJob(
      CRON_EXPRESSION,
      this.run.bind(this),
      null,
      false,
      TZ,
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(
      chalk.yellow('   ├─ 🎖️  Activity Roles') +
        chalk.gray(` • lundi minuit ${TZ}`),
    );
  }

  public stop(): void {
    this.job.stop();
  }

  private async run(): Promise<void> {
    await ActivityRolesService.run(this.client).catch(err =>
      console.error('[ActivityRoles] Erreur rotation:', err),
    );
  }
}
