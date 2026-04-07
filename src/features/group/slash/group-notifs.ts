import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GAMES } from '../data/games';

export const GROUP_NOTIFS_SELECT_ID = 'group:notifs_select';

export default {
  data: new SlashCommandBuilder()
    .setName('group-notifs')
    .setDescription('🔔 Gérer tes notifications de groupes par jeu'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.reply({ content: 'Impossible de récupérer ton profil.', flags: MessageFlags.Ephemeral });
      return;
    }

    const gamesWithRole = GAMES.filter((g) => g.roleId);

    const options = gamesWithRole.map((g) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(g.name)
        .setValue(g.id)
        .setEmoji(g.emoji)
        .setDefault(member.roles.cache.has(g.roleId)),
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId(GROUP_NOTIFS_SELECT_ID)
      .setPlaceholder('Choisis les jeux...')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '## 🔔 Notifications de groupes\n-# Sélectionne les jeux pour lesquels tu veux être pingé quand un groupe est créé.',
        ),
      )
      .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },

  async handleSelect(interaction: any, _client: BotClient) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.reply({ content: 'Impossible de récupérer ton profil.', flags: MessageFlags.Ephemeral });
      return;
    }

    const gamesWithRole = GAMES.filter((g) => g.roleId);
    const selectedGameIds: string[] = interaction.values;

    await Promise.all(
      gamesWithRole.map((g) => {
        const wants = selectedGameIds.includes(g.id);
        const has = member.roles.cache.has(g.roleId);
        if (wants && !has) return member.roles.add(g.roleId);
        if (!wants && has) return member.roles.remove(g.roleId);
      }),
    );

    const added = gamesWithRole.filter((g) => selectedGameIds.includes(g.id)).map((g) => `${g.emoji} ${g.name}`);

    const text = added.length > 0
      ? `✅ Notifications activées pour : ${added.join(', ')}`
      : '✅ Toutes les notifications de groupe ont été désactivées.';

    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(text),
    );

    await interaction.update({
      components: [container],
    });
  },
};
