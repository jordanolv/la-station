import { Client } from 'discord.js';
import { CronJob } from 'cron';
import { BotClient } from '../../../bot/client';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';

export class PartyEmbedRefreshCron {
  private job: CronJob;
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    // Toutes les 5 minutes
    this.job = new CronJob(
      '*/5 * * * *',
      this.refreshPanel.bind(this),
      null,
      false,
      'Europe/Paris',
    );
  }

  public start(): void {
    this.job.start();
    console.log('   ├─ 🎉 Party panel' + ' • toutes les 5 minutes');
  }

  public stop(): void {
    this.job.stop();
  }

  private async refreshPanel(): Promise<void> {
    try {
      await ConfigPanelService.refreshPanel(this.client as BotClient, 'party');
    } catch (err) {
      console.error('[PartyPanelRefresh] Erreur:', err);
    }
  }
}
