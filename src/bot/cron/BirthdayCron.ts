import { CronJob } from 'cron';
import { Client, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { GuildService } from '@/database/services/GuildService';
import GuildUserModel from '@/database/models/GuildUser';


export class BirthdayCron {
    private job: CronJob;
    private client: Client;

    constructor(client: Client) {
        this.client = client;
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
        try {
            const today = new Date();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();

            const users = await GuildUserModel.find({
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
                    const guild = await GuildService.getGuildById(user.guildId);
                    if (!guild) continue;

                    const channelId = guild.config.channels.birthday;
                    if (!channelId) continue;

                    const channelBirthday = await this.client.channels.fetch(channelId);
                    if (!channelBirthday || channelBirthday.type !== ChannelType.GuildText) continue;

                    const textChannel = channelBirthday as TextChannel;

                    const embed = new EmbedBuilder()
                    .setTitle('🎉 Joyeux Anniversaire ! 🎉')
                    .setDescription(`Toute l'équipe souhaite un joyeux anniversaire à <@${user.discordId}> ! 🎂\n\nAujourd'hui, ${user.name} souffle sa ${new Date().getFullYear() - new Date(user.infos.birthDate).getFullYear()}ème bougie !`)
                    .setColor(parseInt(guild.config.colors.primary.replace('#', ''), 16))
                    .setImage('https://c.tenor.com/GscosXEDKhcAAAAd/tenor.gif')
                    .setFooter({ text: 'La Station - Système d\'anniversaire' })
                    .setTimestamp();

                    await textChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error('Error checking birthdays:', error);
        }
    }
} 