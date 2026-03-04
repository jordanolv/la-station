import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ChannelType,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';
import { ChatGamingService } from '../services/chat-gaming.service';

const PANEL_ID = 'chat-gaming';

export const chatGamingPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Chat Gaming',
  emoji: '🎮',
  description: 'Mini-jeux dans le chat',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const cfg = appConfig.features?.chatGaming;
    const enabled = cfg?.enabled ?? false;
    const channelId = cfg?.channelId;
    const games = await ChatGamingService.getAllGames();

    const accent = enabled ? 0x57f287 : 0xed4245;

    // ── Container 1 : configuration ───────────────────────────────────────────
    const configContainer = new ContainerBuilder()
      .setAccentColor(accent)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎮 Chat Gaming'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### Statut\n${enabled ? '✅ Activé' : '❌ Désactivé'}`),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'toggle'))
              .setLabel(enabled ? 'Désactiver' : 'Activer')
              .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 📢 Salon\n${channelId ? `<#${channelId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_channel'))
            .setPlaceholder('Choisir le salon du chat gaming')
            .setChannelTypes(ChannelType.GuildForum),
        ),
      );

    // ── Container 2+ : liste des jeux (max 8 par container) ──────────────────
    const GAMES_PER_CONTAINER = 8;
    const gameContainers: ContainerBuilder[] = [];

    if (games.length === 0) {
      const emptyContainer = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### 🕹️ Jeux (0)`),
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(panelCustomId(PANEL_ID, 'create_game'))
                .setLabel('➕ Créer')
                .setStyle(ButtonStyle.Primary),
            ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# *Aucun jeu créé*'),
        );
      gameContainers.push(emptyContainer);
    } else {
      for (let i = 0; i < games.length; i += GAMES_PER_CONTAINER) {
        const chunk = games.slice(i, i + GAMES_PER_CONTAINER);
        const isFirst = i === 0;
        const isLast = i + GAMES_PER_CONTAINER >= games.length;

        const container = new ContainerBuilder().setAccentColor(0x5865f2);

        if (isFirst) {
          container.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 🕹️ Jeux (${games.length})`),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId(panelCustomId(PANEL_ID, 'create_game'))
                  .setLabel('➕ Créer')
                  .setStyle(ButtonStyle.Primary),
              ),
          );
        }

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        for (const game of chunk) {
          const meta = `-# 🎨 ${game.color ?? '#55CCFC'}${game.image ? ' · 🖼️ image' : ''}`;
          container.addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `**${game.name}**${game.description ? `\n-# ${game.description}` : ''}\n${meta}`,
                ),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setCustomId(panelCustomId(PANEL_ID, `edit_game:${game._id.toString()}`))
                  .setLabel('✏️ Éditer')
                  .setStyle(ButtonStyle.Secondary),
              ),
          );
        }

        if (isLast) {
          container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
          container.addActionRowComponents(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(panelCustomId(PANEL_ID, 'delete_game_select'))
                .setPlaceholder('🗑️ Supprimer un jeu...')
                .addOptions(games.map(g => ({
                  label: g.name,
                  value: g._id.toString(),
                }))),
            ),
          );
        }

        gameContainers.push(container);
      }
    }

    return [configContainer, ...gameContainers];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'toggle') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      if (!appConfig.features.chatGaming) {
        appConfig.features.chatGaming = { enabled: false, channelId: '' } as any;
      }
      appConfig.features.chatGaming!.enabled = !appConfig.features.chatGaming!.enabled;
      appConfig.markModified('features.chatGaming');
      await appConfig.save();

      const now = appConfig.features.chatGaming!.enabled;
      await interaction.reply({ content: now ? '✅ Chat Gaming activé !' : '❌ Chat Gaming désactivé.', flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
      return;
    }

    if (action === 'create_game') {
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_create_game'))
        .setTitle('Créer un jeu')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Nom du jeu')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description (optionnelle)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('color')
              .setLabel('Couleur (ex: #55CCFC)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('#55CCFC')
              .setMaxLength(7),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('image')
              .setLabel('URL de l\'image (optionnelle)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('https://...')
              .setMaxLength(500),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action.startsWith('edit_game:')) {
      const gameId = action.split(':')[1];
      const game = await ChatGamingService.getGameById(gameId);
      if (!game) {
        await interaction.reply({ content: '❌ Jeu introuvable.', flags: MessageFlags.Ephemeral });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, `modal_edit_game:${gameId}`))
        .setTitle(`Éditer : ${game.name}`)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Nom du jeu')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50)
              .setValue(game.name),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description (optionnelle)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500)
              .setValue(game.description ?? ''),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('color')
              .setLabel('Couleur (ex: #55CCFC)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('#55CCFC')
              .setMaxLength(7)
              .setValue(game.color ?? ''),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('image')
              .setLabel("URL de l'image (optionnelle)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('https://...')
              .setMaxLength(500)
              .setValue(game.image ?? ''),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

  },

  async handleSelectMenu(interaction: ChannelSelectMenuInteraction | StringSelectMenuInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'delete_game_select') {
      const gameId = interaction.values[0];
      try {
        await ChatGamingService.deleteGame(client, gameId);
        await interaction.reply({ content: '✅ Jeu supprimé.', flags: MessageFlags.Ephemeral });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        await interaction.reply({ content: '❌ Erreur lors de la suppression.', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    const channelId = interaction.values[0];
    const appConfig = await AppConfigService.getOrCreateConfig();

    if (!appConfig.features.chatGaming) {
      appConfig.features.chatGaming = { enabled: false, channelId: '' } as any;
    }
    appConfig.features.chatGaming!.channelId = channelId;
    await appConfig.save();

    await interaction.reply({ content: `✅ Salon du chat gaming : <#${channelId}>`, flags: MessageFlags.Ephemeral });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleModal(interaction: ModalSubmitInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'modal_create_game') {
      const name = interaction.fields.getTextInputValue('name').trim();
      const description = interaction.fields.getTextInputValue('description').trim() || undefined;
      const colorRaw = interaction.fields.getTextInputValue('color').trim();
      const color = /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw : undefined;
      const imageRaw = interaction.fields.getTextInputValue('image').trim();
      const imageUrl = imageRaw.startsWith('http') ? imageRaw : undefined;

      if (name.length < 2) {
        await interaction.reply({ content: '❌ Le nom doit faire au moins 2 caractères.', flags: MessageFlags.Ephemeral });
        return;
      }

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const game = await ChatGamingService.createGame(client, { name, description, color, image: imageUrl });
        await interaction.editReply({ content: `✅ Jeu **${game.name}** créé !` });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[ChatGamingPanel] Erreur création jeu:', err);
        await interaction.editReply({ content: '❌ Erreur lors de la création du jeu.' });
      }
      return;
    }

    if (action.startsWith('modal_edit_game:')) {
      const gameId = action.split(':')[1];
      const name = interaction.fields.getTextInputValue('name').trim();
      const description = interaction.fields.getTextInputValue('description').trim() || undefined;
      const colorRaw = interaction.fields.getTextInputValue('color').trim();
      const color = /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw : undefined;
      const imageRaw = interaction.fields.getTextInputValue('image').trim();
      const imageUrl = imageRaw.startsWith('http') ? imageRaw : undefined;

      if (name.length < 2) {
        await interaction.reply({ content: '❌ Le nom doit faire au moins 2 caractères.', flags: MessageFlags.Ephemeral });
        return;
      }

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await ChatGamingService.updateGame(client, gameId, { name, description, color, image: imageUrl });
        await interaction.editReply({ content: `✅ Jeu **${name}** mis à jour !` });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[ChatGamingPanel] Erreur édition jeu:', err);
        await interaction.editReply({ content: '❌ Erreur lors de la mise à jour du jeu.' });
      }
    }
  },
};
