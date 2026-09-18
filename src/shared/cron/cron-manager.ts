import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { PeakHuntersCronManager } from '../../features/peak-hunters/cron';
import { ActivityRolesCronManager } from '../../features/activity-roles/cron';
import { QuizCronManager } from '../../features/quiz/cron';
import { BingoCronManager } from '../../features/arcade/bingo/cron';
import { JustePrixCronManager } from '../../features/arcade/juste-prix/cron';
import { AvalancheCronManager } from '../../features/arcade/avalanche/cron';
import { EnigmeCronManager } from '../../features/arcade/enigme/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';
import { BotClient } from '../../bot/client';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private mountainCronManager: PeakHuntersCronManager;
    private activityRolesCronManager: ActivityRolesCronManager;
    private quizCronManager: QuizCronManager;
    private bingoCronManager: BingoCronManager;
    private justePrixCronManager: JustePrixCronManager;
    private avalancheCronManager: AvalancheCronManager;
    private enigmeCronManager: EnigmeCronManager;

    constructor(client: BotClient) {
        super(client, 'global');

        this.userCronManager = new UserCronManager(client);
        this.mountainCronManager = new PeakHuntersCronManager(client);
        this.activityRolesCronManager = new ActivityRolesCronManager(client);
        this.quizCronManager = new QuizCronManager(client);
        this.bingoCronManager = new BingoCronManager(client);
        this.justePrixCronManager = new JustePrixCronManager(client);
        this.avalancheCronManager = new AvalancheCronManager(client);
        this.enigmeCronManager = new EnigmeCronManager(client);

        this.addCron(this.userCronManager);
        this.addCron(this.mountainCronManager);
        this.addCron(this.activityRolesCronManager);
        this.addCron(this.quizCronManager);
        this.addCron(this.bingoCronManager);
        this.addCron(this.justePrixCronManager);
        this.addCron(this.avalancheCronManager);
        this.addCron(this.enigmeCronManager);
    }

    public getUserCronManager(): UserCronManager {
        return this.userCronManager;
    }
} 