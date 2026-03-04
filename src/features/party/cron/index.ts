import { Client } from 'discord.js';
import { BaseCronManager } from '../../../shared/cron/base-cron-manager';
import { PartyEmbedRefreshCron } from './party-embed-refresh.cron';

export class PartyCronManager extends BaseCronManager {
  private embedRefreshCron: PartyEmbedRefreshCron;

  constructor(client: Client) {
    super(client, 'party');
    this.embedRefreshCron = new PartyEmbedRefreshCron(client);
    this.addCron(this.embedRefreshCron);
  }
}
