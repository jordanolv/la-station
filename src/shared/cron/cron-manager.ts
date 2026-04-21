import { Client } from 'discord.js';
import { UserCronManager } from '../../features/user/cron';
import { PeakHuntersCronManager } from '../../features/peak-hunters/cron';
import { ActivityRolesCronManager } from '../../features/activity-roles/cron';
import { QuizCronManager } from '../../features/quiz/cron';
import { BingoCronManager } from '../../features/arcade/bingo/cron';
import { BaseCronManager, IStartStoppable } from './base-cron-manager';
import { LogsDayCron } from './logs-day.cron';
import { BotClient } from '../../bot/client';

export class CronManager extends BaseCronManager {
    private userCronManager: UserCronManager;
    private mountainCronManager: PeakHuntersCronManager;
    private activityRolesCronManager: ActivityRolesCronManager;
    private quizCronManager: QuizCronManager;
    private bingoCronManager: BingoCronManager;
    private logsDayCron: LogsDayCron;

    constructor(client: BotClient) {
        super(client, 'global');

        this.userCronManager = new UserCronManager(client);
        this.mountainCronManager = new PeakHuntersCronManager(client);
        this.activityRolesCronManager = new ActivityRolesCronManager(client);
        this.quizCronManager = new QuizCronManager(client);
        this.bingoCronManager = new BingoCronManager(client);
        this.logsDayCron = new LogsDayCron(client);

        this.addCron(this.userCronManager);
        this.addCron(this.mountainCronManager);
        this.addCron(this.activityRolesCronManager);
        this.addCron(this.quizCronManager);
        this.addCron(this.bingoCronManager);
        this.addCron(this.logsDayCron);
    }

    public getUserCronManager(): UserCronManager {
        return this.userCronManager;
    }
} 