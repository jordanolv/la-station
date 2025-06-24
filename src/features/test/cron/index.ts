import { Client } from 'discord.js';
import { TestLogCron } from './test-log.cron';
import { BaseCronManager } from '../../../shared/cron/base-cron-manager';

export class TestCronManager extends BaseCronManager {
    private testLogCron: TestLogCron;

    constructor(client: Client) {
        super(client, 'test');
        
        // Initialisation des crons de test
        // this.testLogCron = new TestLogCron(client);
        // this.addCron(this.testLogCron);
    }

    /**
     * Récupère le cron de test
     */
    public getTestLogCron(): TestLogCron {
        return this.testLogCron;
    }
} 