import { Client } from 'discord.js';
import { BirthdayCron } from './BirthdayCron';

export class CronManager {
    private crons: { start: () => void; stop: () => void }[] = [];

    constructor(client: Client) {
        // Initialisation de tous les crons
        this.crons.push(new BirthdayCron(client));
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
} 