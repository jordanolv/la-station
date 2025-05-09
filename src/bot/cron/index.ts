import { Client } from 'discord.js';
import { BirthdayCron } from './BirthdayCron';

export class CronManager {
    private crons: { start: () => void; stop: () => void }[] = [];
    private birthdayCron: BirthdayCron;

    constructor(client: Client) {
        // Initialisation de tous les crons
        this.birthdayCron = new BirthdayCron(client);
        this.crons.push(this.birthdayCron);
        // Ajoutez ici d'autres crons au fur et à mesure
    }

    public startAll(): void {
        console.log('Starting all cron jobs...');
        this.crons.forEach(cron => cron.start());
    }

    public stopAll(): void {
        console.log('Stopping all cron jobs...');
        this.crons.forEach(cron => cron.stop());
    }

    public getBirthdayCron(): BirthdayCron {
        return this.birthdayCron;
    }
} 