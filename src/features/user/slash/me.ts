import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { UserService } from '../services/guildUser.service';
import { ProfileCardService } from '../services/meCard.service';

type GuildUserDoc = NonNullable<Awaited<ReturnType<typeof UserService.getGuildUserByDiscordId>>>;

async function buildCard(
  discordUser: { username: string; displayAvatarURL: (options?: { size?: number; extension?: string }) => string },
  guildUser: GuildUserDoc,
  guildName: string,
  roles: { name: string; color: string }[],
  backgroundUrl: string | undefined = process.env.PROFILE_CARD_BACKGROUND_URL
) {
  const { buffer, filename } = await ProfileCardService.generate({
    view: 'info',
    discordUser,
    guildUser,
    guildName,
    backgroundUrl,
    roles
  });

  return {
    attachment: { attachment: buffer, name: filename }
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Afficher vos informations personnelles'),
  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    try {
      if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          ephemeral: true
        });
        return;
      }

      const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé dans la base de données.',
          ephemeral: true
        });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          name: role.name,
          color: role.hexColor
        }));

      const { attachment } = await buildCard(interaction.user, user, interaction.guild.name, roles);

      await interaction.reply({
        files: [attachment]
      });
    } catch (error) {
      console.error('Erreur dans la commande /me:', error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
          ephemeral: true
        });
      }
    }
  }
};
