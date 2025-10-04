import { CronJob } from 'cron';
import { Client, EmbedBuilder, TextChannel, ChannelType, PermissionsBitField } from 'discord.js';
import { toZonedTime } from 'date-fns-tz';
import GuildUserModel from '../models/guild-user.model';
import GuildModel from '../../discord/models/guild.model';
import { LogService } from '../../../shared/logs/logs.service';

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

      // Récupérer toutes les guildes où le bot est présent
      const guilds = this.client.guilds.cache;
      
      for (const [guildId, discordGuild] of guilds) {
        try {
          // Vérifier si le channel de logs est configuré
          const logChannelId = await LogService.getLogsChannelId(guildId);
          if (!logChannelId) {
            continue;
          }

          await LogService.info(this.client as any, guildId, `Vérification des anniversaires pour ${dayToday}/${monthToday} (Paris)`, {
            feature: 'birthday'
          });

          // Récupérer la configuration d'anniversaire pour cette guilde
          const guildDoc = await GuildModel.findOne({ guildId });
          const birthdayConfig = guildDoc?.features?.birthday;
          
          // Vérifier si la fonctionnalité est activée
          if (!birthdayConfig?.enabled) {
            await LogService.info(this.client as any, guildId, `Fonctionnalité d'anniversaire désactivée pour cette guilde`, {
              feature: 'birthday'
            });
            continue;
          }

          // Récupérer les utilisateurs ayant une date d'anniversaire
          const users = await GuildUserModel.find({
            guildId,
            'infos.birthDate': { $exists: true, $ne: null }
          });

          // Récupérer le canal d'anniversaire configuré
          const birthdayChannelId = birthdayConfig?.channel || discordGuild.systemChannelId;
          if (!birthdayChannelId) {
            await LogService.warning(this.client as any, guildId, `Aucun canal d'anniversaire configuré`, {
              feature: 'birthday'
            });
            continue;
          }

          for (const user of users) {
            if (!user.infos.birthDate) continue;

            const bdParis = toZonedTime(new Date(user.infos.birthDate), this.TZ);
            const monthBirth = bdParis.getMonth() + 1;
            const dayBirth = bdParis.getDate();

            if (monthBirth !== monthToday || dayBirth !== dayToday) {
              continue;
            }

            const chan = await this.client.channels.fetch(birthdayChannelId).catch(() => null);
            if (!chan || chan.type !== ChannelType.GuildText) {
              await LogService.error(this.client as any, guildId, `Canal ${birthdayChannelId} non trouvé ou n'est pas un canal texte`, {
                feature: 'birthday'
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
              await LogService.error(this.client as any, guildId, `Permission d'envoi manquante dans le canal ${birthdayChannelId}`, {
                feature: 'birthday'
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
              .setColor(0xdac1ff) // Utilisation d'une couleur par défaut
              .setImage('https://c.tenor.com/GscosXEDKhcAAAAd/tenor.gif')
              .setTimestamp(nowParis);

            await textChannel.send({ embeds: [embed] });
            await LogService.success(this.client as any, guildId, `Message d'anniversaire envoyé pour ${user.name}`, {
              feature: 'birthday'
            });
          }
        } catch (guildError) {
          console.error(`Error processing guild ${guildId}:`, guildError);
        }
      }
    } catch (err) {
      console.error('Error in BirthdayCron:', err);
      // Log l'erreur dans toutes les guildes où le bot est présent
      for (const [guildId] of this.client.guilds.cache) {
        try {
          await LogService.error(this.client as any, guildId, `Erreur lors de la vérification des anniversaires: ${err.message}`, {
            feature: 'birthday'
          });
        } catch (logError) {
          console.error(`Error logging to guild ${guildId}:`, logError);
        }
      }
    }
  }
} 