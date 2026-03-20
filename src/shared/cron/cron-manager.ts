import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { MountainCronManager } from '../../features/mountain/cron';
import { ActivityRolesCronManager } from '../../features/activity-roles/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';
import { LogsDayCron } from './logs-day.cron';
import { BotClient } from '../../bot/client';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private mountainCronManager: MountainCronManager;
    private activityRolesCronManager: ActivityRolesCronManager;
    private logsDayCron: LogsDayCron;

    constructor(client: BotClient) {
        super(client, 'global');

        this.userCronManager = new UserCronManager(client);
        this.mountainCronManager = new MountainCronManager(client);
        this.activityRolesCronManager = new ActivityRolesCronManager(client);
        this.logsDayCron = new LogsDayCron(client);

        this.addCron(this.userCronManager);
        this.addCron(this.mountainCronManager);
        this.addCron(this.activityRolesCronManager);
        this.addCron(this.logsDayCron);
    }

    public getUserCronManager(): UserCronManager {
        return this.userCronManager;
    }
} 