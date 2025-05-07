import { CronJob } from 'cron';
import { Client, EmbedBuilder, TextChannel, ChannelType, PermissionsBitField } from 'discord.js';
import { toZonedTime } from 'date-fns-tz';
import GuildUserModel from '@/database/models/GuildUser';
import { GuildService } from '@/database/services/GuildService';
import { LogService } from '../services/LogService';

export class BirthdayCron {
  private job: CronJob;
  private client: Client;
  private readonly TZ = 'Europe/Paris';

  constructor(client: Client) {
    this.client = client;

    // Tous les jours à 00:00:00 (Paris)
    this.job = new CronJob(
    //   '0 0 0 * * *',               // sec min hr day mon wday
    '*/5 * * * * *',
      this.checkBirthdays.bind(this),
      null,
      false,
      this.TZ
    );
  }

  public start(): void {
    this.job.start();
    console.log(`🎂 Birthday cron started (runs daily at 00:00 ${this.TZ})`);
  }

  public stop(): void {
    this.job.stop();
    console.log('🎂 Birthday cron stopped');
  }

  private async checkBirthdays(): Promise<void> {
    try {
      const nowParis   = toZonedTime(new Date(), this.TZ);
      const monthToday = nowParis.getMonth() + 1;
      const dayToday   = nowParis.getDate();

      console.log(`Checking birthdays for ${dayToday}/${monthToday} (Paris)`);

      const users = await GuildUserModel.find({
        'infos.birthDate': { $exists: true, $ne: null }
      });

      for (const user of users) {
        if (!user.infos.birthDate) continue;

        const bdParis    = toZonedTime(new Date(user.infos.birthDate), this.TZ);
        const monthBirth = bdParis.getMonth() + 1;
        const dayBirth   = bdParis.getDate();

        if (monthBirth !== monthToday || dayBirth !== dayToday) {
          continue;
        }

        // Récupère la config de la guilde en base
        const guildConfig = await GuildService.getGuildById(user.guildId);
        if (!guildConfig) {
          console.warn(`Guild config not found for guildId=${user.guildId}`);
          continue;
        }

        const channelId = guildConfig.config.channels?.birthday;
        if (!channelId) {
          console.warn(`No birthday channel configured for guildId=${user.guildId}`);
          continue;
        }

        // Fetch le guild et le channel en une seule passe
        const guild = await this.client.guilds.fetch(user.guildId).catch(() => null);
        if (!guild) {
          await LogService.error(user.guildId, `Bot not in guild ${user.guildId}`, {
            feature: 'birthday',
            footer: 'BirthdayCron'
          });
          continue;
        }

        const chan = await this.client.channels.fetch(channelId).catch(() => null);
        if (!chan || chan.type !== ChannelType.GuildText) {
          await LogService.error(user.guildId, `Channel ${channelId} not found or not text in guild ${user.guildId}`, {
            feature: 'birthday',
            footer: 'BirthdayCron'
          });
          continue;
        }
        const textChannel = chan as TextChannel;

        // Vérifie la permission d'envoyer
        const me = this.client.user;
        if (
          !me ||
          !textChannel.permissionsFor(me).has(PermissionsBitField.Flags.SendMessages)
        ) {
          await LogService.error(user.guildId, `Missing SendMessages permission in channel ${channelId}`, {
            feature: 'birthday',
            footer: 'BirthdayCron'
          });
          continue;
        }

        // Envoi de l'embed
        const age = nowParis.getFullYear() - bdParis.getFullYear();
        const embed = new EmbedBuilder()
          .setTitle('🎉 Joyeux Anniversaire ! 🎉')
          .setDescription(
            `Toute l'équipe souhaite un joyeux anniversaire à <@${user.discordId}> ! 🎂\n\n` +
            `Aujourd'hui, ${user.name} souffle sa ${age}ème bougie !`
          )
          .setColor(parseInt(guildConfig.config.colors.primary.replace('#', ''), 16))
          .setImage('https://c.tenor.com/GscosXEDKhcAAAAd/tenor.gif')
          .setTimestamp(nowParis);

        await textChannel.send({ embeds: [embed] });
        await LogService.success(user.guildId, `Sent birthday message for ${user.name}`, {
          feature: 'birthday',
          footer: 'BirthdayCron'
        });
      }
    } catch (err) {
      console.error('Error in BirthdayCron:', err);
    }
  }
}
