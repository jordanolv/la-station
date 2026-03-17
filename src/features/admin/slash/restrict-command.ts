import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AppConfigService } from '../../discord/services/app-config.service';

export default {
  data: new SlashCommandBuilder()
    .setName('restrict-command')
    .setDescription('Restreindre une commande à un channel spécifique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Restreindre une commande à un channel')
        .addStringOption(opt =>
          opt.setName('commande')
            .setDescription('Nom de la commande slash (sans /)')
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel autorisé')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Supprimer la restriction d\'une commande')
        .addStringOption(opt =>
          opt.setName('commande')
            .setDescription('Nom de la commande slash (sans /)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lister toutes les restrictions actives')),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const commandName = interaction.options.getString('commande', true).toLowerCase();
      const channel = interaction.options.getChannel('channel', true);

      if (!client.slashCommands.has(commandName)) {
        await interaction.reply({ content: `❌ Commande \`/${commandName}\` introuvable.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await AppConfigService.setCommandChannel(commandName, channel.id);
      await interaction.reply({ content: `✅ \`/${commandName}\` restreinte à <#${channel.id}>.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'remove') {
      const commandName = interaction.options.getString('commande', true).toLowerCase();

      await AppConfigService.removeCommandChannel(commandName);
      await interaction.reply({ content: `✅ Restriction supprimée pour \`/${commandName}\`.`, flags: MessageFlags.Ephemeral });

    } else if (sub === 'list') {
      const commandChannels = await AppConfigService.getCommandChannels();
      const entries = Object.entries(commandChannels);

      if (entries.length === 0) {
        await interaction.reply({ content: 'Aucune restriction de channel configurée.', flags: MessageFlags.Ephemeral });
        return;
      }

      const lines = entries.map(([cmd, channelId]) => `\`/${cmd}\` → <#${channelId}>`).join('\n');
      await interaction.reply({ content: `**Restrictions actives :**\n${lines}`, flags: MessageFlags.Ephemeral });
    }
  }
};
