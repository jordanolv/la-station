import { CronJob } from 'cron';
import { Client } from 'discord.js';
import UserModel from '../../database/models/User';

export class BirthdayCron {
    private job: CronJob;
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        // */5 * * * * * signifie toutes les 5 secondes
        this.job = new CronJob('0 0 * * *', this.checkBirthdays.bind(this));
        // this.job = new CronJob('*/5 * * * * *', this.checkBirthdays.bind(this));
    }

    public start(): void {
        this.job.start();
        console.log('Birthday cron job started');
    }

    public stop(): void {
        this.job.stop();
        console.log('Birthday cron job stopped');
    }

    private async checkBirthdays(): Promise<void> {
        console.log('Checking birthdays...');
        try {
            const today = new Date();
            const todayMonth = today.getMonth() + 1; // +1 car getMonth() retourne 0-11
            const todayDay = today.getDate();

            const users = await UserModel.find({
                'infos.birthDate': {
                    $exists: true,
                    $ne: null
                }
            });

            for (const user of users) {
                if (!user.infos.birthDate) continue;

                const birthDate = new Date(user.infos.birthDate);
                const birthMonth = birthDate.getMonth() + 1;
                const birthDay = birthDate.getDate();

                if (birthMonth === todayMonth && birthDay === todayDay) {
                    // TODO: Implémenter la logique pour souhaiter l'anniversaire
                    // Par exemple, envoyer un message dans un canal spécifique
                    console.log(`C'est l'anniversaire de ${user.name} aujourd'hui !`);
                }
            }
        } catch (error) {
            console.error('Error checking birthdays:', error);
        }
    }
} 