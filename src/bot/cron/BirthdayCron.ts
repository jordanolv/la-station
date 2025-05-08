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
      '0 0 0 * * *',               // sec min hr day mon wday
    // '*/5 * * * * *',
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
      const nowParis = toZonedTime(new Date(), this.TZ);
      const monthToday = nowParis.getMonth() + 1;
      const dayToday = nowParis.getDate();

      // Récupérer toutes les guildes où le bot est présent
      const guilds = this.client.guilds.cache;
      
      for (const [guildId, guild] of guilds) {
        // Vérifier la configuration des logs pour chaque guilde
        const guildConfig = await GuildService.getGuildById(guildId);
        if (!guildConfig?.features?.logs?.enabled || !guildConfig?.features?.logs?.channel) {
          continue;
        }

        await LogService.info(guildId, `Vérification des anniversaires pour ${dayToday}/${monthToday} (Paris)`, {
          feature: 'birthday',
          footer: 'BirthdayCron',
          file: 'BirthdayCron.ts',
          line: 45
        });

        const users = await GuildUserModel.find({
          guildId,
          'infos.birthDate': { $exists: true, $ne: null }
        });

        for (const user of users) {
          if (!user.infos.birthDate) continue;

          const bdParis = toZonedTime(new Date(user.infos.birthDate), this.TZ);
          const monthBirth = bdParis.getMonth() + 1;
          const dayBirth = bdParis.getDate();

          if (monthBirth !== monthToday || dayBirth !== dayToday) {
            continue;
          }

          const channelId = guildConfig.config.channels?.birthday;
          if (!channelId) {
            await LogService.warning(guildId, `Aucun canal d'anniversaire configuré`, {
              feature: 'birthday',
              footer: 'BirthdayCron',
              file: 'BirthdayCron.ts',
              line: 65
            });
            continue;
          }

          const chan = await this.client.channels.fetch(channelId).catch(() => null);
          if (!chan || chan.type !== ChannelType.GuildText) {
            await LogService.error(guildId, `Canal ${channelId} non trouvé ou n'est pas un canal texte`, {
              feature: 'birthday',
              footer: 'BirthdayCron',
              file: 'BirthdayCron.ts',
              line: 75
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
            await LogService.error(guildId, `Permission d'envoi manquante dans le canal ${channelId}`, {
              feature: 'birthday',
              footer: 'BirthdayCron',
              file: 'BirthdayCron.ts',
              line: 85
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
          await LogService.success(guildId, `Message d'anniversaire envoyé pour ${user.name}`, {
            feature: 'birthday',
            footer: 'BirthdayCron',
            file: 'BirthdayCron.ts',
            line: 105
          });
        }
      }
    } catch (err) {
      console.error('Error in BirthdayCron:', err);
      // Log l'erreur dans toutes les guildes où le bot est présent
      for (const [guildId] of this.client.guilds.cache) {
        await LogService.error(guildId, `Erreur lors de la vérification des anniversaires: ${err.message}`, {
          feature: 'birthday',
          footer: 'BirthdayCron',
          file: 'BirthdayCron.ts',
          line: 115
        });
      }
    }
  }
}
