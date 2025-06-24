import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { TestCronManager } from '../../features/test/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private testCronManager: TestCronManager;

    constructor(client: Client) {
        super(client, 'global');
        
        // Initialisation des gestionnaires de crons de chaque feature
        this.userCronManager = new UserCronManager(client);
        this.testCronManager = new TestCronManager(client);
        
        this.addCron(this.userCronManager);
        this.addCron(this.testCronManager);
        
        // Ajoutez ici d'autres gestionnaires de crons au fur et à mesure
        // Exemple: this.vocCronManager = new VocCronManager(client);
        // this.addCron(this.vocCronManager);
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