import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { BotClient } from '../../../bot/client';
import { ActivityRolesCron } from './activity-roles.cron';

export class ActivityRolesCronManager extends BaseCronManager {
  constructor(client: BotClient) {
    super(client, 'activity-roles');
    this.addCron(new ActivityRolesCron(client));
  }
}
