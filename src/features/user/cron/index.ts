import { Client } from 'discord.js';
import { BirthdayCron } from './birthday.cron';
import { BaseCronManager } from '../../../shared/cron/base-cron-manager';

export class UserCronManager extends BaseCronManager {
    private birthdayCron: BirthdayCron;

    constructor(client: Client) {
        super(client, 'user');
        
        // Initialisation des crons liés aux utilisateurs
        this.birthdayCron = new BirthdayCron(client);
        this.addCron(this.birthdayCron);
    }

    /**
     * Récupère le cron des anniversaires
     */
    public getBirthdayCron(): BirthdayCron {
        return this.birthdayCron;
    }
} 