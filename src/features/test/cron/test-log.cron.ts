import { CronJob } from 'cron';
import { Client } from 'discord.js';
import chalk from 'chalk';

export class TestLogCron {
  private job: CronJob;
  private client: Client;
  private counter: number = 0;

  constructor(client: Client) {
    this.client = client;

    // Exécution toutes les 5 secondes
    this.job = new CronJob(
      '*/5 * * * * *',  // sec min hr day mon wday
      this.logMessage.bind(this),
      null,
      false,
      'Europe/Paris'
    );
  }

  public start(): void {
    this.job.start();
    console.log(chalk.yellow('   ├─ 🧪 Test') + chalk.gray(` • toutes les 5 secondes`));
  }

  public stop(): void {
    this.job.stop();
  }

  private async logMessage(): Promise<void> {
    try {
      this.counter++;
      const timestamp = new Date().toISOString();
      console.log(chalk.magenta(`[TEST CRON] ${timestamp} - This is test message #${this.counter}`));
      
      // Afficher le nombre de serveurs où le bot est présent
      const guildCount = this.client.guilds.cache.size;
      console.log(chalk.yellow(`[TEST CRON] Bot is currently in ${guildCount} guild(s)`));
    } catch (err) {
      console.error('Error in TestLogCron:', err);
    }
  }
} 