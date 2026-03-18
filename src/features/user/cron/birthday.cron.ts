import { CronJob } from 'cron';
import { Client, EmbedBuilder, TextChannel, ChannelType, PermissionsBitField } from 'discord.js';
import { toZonedTime } from 'date-fns-tz';
import UserModel from '../models/user.model';
import AppConfigModel from '../../discord/models/app-config.model';
import { LogService } from '../../../shared/logs/logs.service';
import { getGuildId } from '../../../shared/guild';

export class BirthdayCron {
  private job: CronJob;
  private client: Client;
  private readonly TZ = 'Europe/Paris';

  constructor(client: Client) {
    this.client = client;

    this.job = new CronJob(
      '0 0 0 * * *',
      this.checkBirthdays.bind(this),
      null,
      false,
      this.TZ
    );
  }

  public start(): void {
    this.job.start();
    const chalk = require('chalk');
    console.log(chalk.yellow('   ├─ 🎂 Birthday') + chalk.gray(` • tous les jours à 00:00 ${this.TZ}`));
  }

  public stop(): void {
    this.job.stop();
  }

  public async checkBirthdays(): Promise<void> {
    try {
      const nowParis = toZonedTime(new Date(), this.TZ);
      const monthToday = nowParis.getMonth() + 1;
      const dayToday = nowParis.getDate();

      await LogService.info(this.client as any, `Vérification des anniversaires pour ${dayToday}/${monthToday} (Paris)`, {
        feature: 'birthday'
      });

      const guildDoc = await AppConfigModel.findOne({});
      const birthdayConfig = guildDoc?.features?.birthday;

      if (!birthdayConfig?.enabled) {
        await LogService.info(this.client as any, `Fonctionnalité d'anniversaire désactivée`, { feature: 'birthday' });
        return;
      }

      const users = await UserModel.find({
        'infos.birthDate': { $exists: true, $ne: null }
      });

      const discordGuild = this.client.guilds.cache.get(getGuildId());
      const birthdayChannelId = birthdayConfig?.channel || discordGuild?.systemChannelId;
      if (!birthdayChannelId) {
        await LogService.warning(this.client as any, `Aucun canal d'anniversaire configuré`, { feature: 'birthday' });
        return;
      }

      for (const user of users) {
        if (!user.infos.birthDate) continue;

        const bdParis = toZonedTime(new Date(user.infos.birthDate), this.TZ);
        const monthBirth = bdParis.getMonth() + 1;
        const dayBirth = bdParis.getDate();

        if (monthBirth !== monthToday || dayBirth !== dayToday) continue;

        const chan = await this.client.channels.fetch(birthdayChannelId).catch(() => null);
        if (!chan || chan.type !== ChannelType.GuildText) {
          await LogService.error(this.client as any, `Canal ${birthdayChannelId} non trouvé ou n'est pas un canal texte`, { feature: 'birthday' });
          continue;
        }
        const textChannel = chan as TextChannel;

        const me = this.client.user;
        if (!me || !textChannel.permissionsFor(me).has(PermissionsBitField.Flags.SendMessages)) {
          await LogService.error(this.client as any, `Permission d'envoi manquante dans le canal ${birthdayChannelId}`, { feature: 'birthday' });
          continue;
        }

        const age = nowParis.getFullYear() - bdParis.getFullYear();
        const discordUser = await this.client.users.fetch(user.discordId).catch(() => null);
        const avatarUrl = discordUser?.displayAvatarURL({ size: 256 });

        const embed = new EmbedBuilder()
          .setTitle('🎉 Joyeux Anniversaire ! 🎉')
          .setDescription(
            `Toute l'équipe souhaite un joyeux anniversaire à <@${user.discordId}> ! 🎂\n\n` +
            `Aujourd'hui, ${user.name} souffle sa ${age}ème bougie !`
          )
          .setColor(0xdac1ff)
          .setImage('https://c.tenor.com/GscosXEDKhcAAAAd/tenor.gif')
          .setTimestamp(nowParis)
          .setFooter({ text: `🎂 ${age} ans aujourd'hui !` });

        if (avatarUrl) embed.setThumbnail(avatarUrl);

        await textChannel.send({ embeds: [embed] });
        await LogService.success(this.client as any, `Message d'anniversaire envoyé pour ${user.name}`, { feature: 'birthday' });
      }
    } catch (err) {
      console.error('Error in BirthdayCron:', err);
      await LogService.error(this.client as any, `Erreur lors de la vérification des anniversaires: ${err.message}`, { feature: 'birthday' });
    }
  }
}
