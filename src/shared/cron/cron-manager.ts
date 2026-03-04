import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { TestCronManager } from '../../features/test/cron';
import { PartyCronManager } from '../../features/party/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';
import { LogsDayCron } from './logs-day.cron';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private testCronManager: TestCronManager;
    private partyCronManager: PartyCronManager;
    private logsDayCron: LogsDayCron;

    constructor(client: Client) {
        super(client, 'global');

        this.userCronManager = new UserCronManager(client);
        this.testCronManager = new TestCronManager(client);
        this.partyCronManager = new PartyCronManager(client);
        this.logsDayCron = new LogsDayCron(client);

        this.addCron(this.userCronManager);
        this.addCron(this.testCronManager);
        this.addCron(this.partyCronManager);
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