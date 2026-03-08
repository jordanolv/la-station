import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { TestCronManager } from '../../features/test/cron';
import { PartyCronManager } from '../../features/party/cron';
import { MountainCronManager } from '../../features/mountain/cron';
import { ActivityRolesCronManager } from '../../features/activity-roles/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';
import { LogsDayCron } from './logs-day.cron';
import { BotClient } from '../../bot/client';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private testCronManager: TestCronManager;
    private partyCronManager: PartyCronManager;
    private mountainCronManager: MountainCronManager;
    private activityRolesCronManager: ActivityRolesCronManager;
    private logsDayCron: LogsDayCron;

    constructor(client: BotClient) {
        super(client, 'global');

        this.userCronManager = new UserCronManager(client);
        this.testCronManager = new TestCronManager(client);
        this.partyCronManager = new PartyCronManager(client);
        this.mountainCronManager = new MountainCronManager(client);
        this.activityRolesCronManager = new ActivityRolesCronManager(client);
        this.logsDayCron = new LogsDayCron(client);

        this.addCron(this.userCronManager);
        this.addCron(this.testCronManager);
        this.addCron(this.partyCronManager);
        this.addCron(this.mountainCronManager);
        this.addCron(this.activityRolesCronManager);
        this.addCron(this.logsDayCron);
    }

    /**
     * Récupère le gestionnaire de crons de la feature user
     */
    public getUserCronManager(): UserCronManager {
        return this.userCronManager;
    }

    /**
     * Récupère le gestionnaire de crons de la feature test
     */
    public getTestCronManager(): TestCronManager {
        return this.testCronManager;
    }

} 