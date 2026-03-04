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
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  FileUploadBuilder,
  LabelBuilder,
  ChannelType,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  RoleSelectMenuInteraction,
  UserSelectMenuInteraction,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';
import { PartyService } from '../services/party.service';
import { ChatGamingService } from '../../chat-gaming/services/chat-gaming.service';

const PANEL_ID = 'party';

// Stockage temporaire des participants sélectionnés (TTL 10 min)
const attendedCache = new Map<string, { ids: string[]; expiresAt: number }>();
function cacheAttended(eventId: string, ids: string[]): void {
  attendedCache.set(eventId, { ids, expiresAt: Date.now() + 10 * 60 * 1000 });
}
function getAttended(eventId: string): string[] {
  const entry = attendedCache.get(eventId);
  if (!entry || Date.now() > entry.expiresAt) return [];
  return entry.ids;
}

async function _createEvent(
  interaction: ModalSubmitInteraction,
  client: BotClient,
  data: { name: string; game: string; datetimeRaw: string; maxSlotsRaw: string; imageUrl: string | undefined; chatGamingGameId?: string },
): Promise<void> {
  const dateMatch = data.datetimeRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!dateMatch) {
    await interaction.reply({ content: '❌ Format de date invalide. Utilisez `JJ/MM/AAAA HH:MM`.', flags: MessageFlags.Ephemeral });
    return;
  }
  const [, dd, mm, yyyy, hh, min] = dateMatch;
  const dateTime = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
  if (isNaN(dateTime.getTime()) || dateTime < new Date()) {
    await interaction.reply({ content: '❌ Date invalide ou dans le passé.', flags: MessageFlags.Ephemeral });
    return;
  }

  const maxSlots = parseInt(data.maxSlotsRaw, 10);
  if (isNaN(maxSlots) || maxSlots < 1 || maxSlots > 50) {
    await interaction.reply({ content: '❌ Le nombre de places doit être entre 1 et 50.', flags: MessageFlags.Ephemeral });
    return;
  }

  const appConfig = await AppConfigService.getOrCreateConfig();
  const channelId = appConfig.features?.party?.channelId;
  if (!channelId) {
    await interaction.reply({ content: '❌ Aucun forum configuré pour les soirées.', flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const event = await PartyService.createEvent(client, {
      name: data.name,
      game: data.game,
      dateTime,
      maxSlots,
      channelId,
      createdBy: interaction.user.id,
      chatGamingGameId: data.chatGamingGameId,
      image: data.imageUrl,
      announcementChannelId: appConfig.features?.party?.announcementChannelId,
    });
    await interaction.editReply({ content: `✅ Soirée **${event.eventInfo.name}** créée !` });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  } catch (err) {
    console.error('[PartyPanel] Erreur création soirée:', err);
    await interaction.editReply({ content: '❌ Erreur lors de la création de la soirée.' });
  }
}

export const partyPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Soirées',
  emoji: '🎉',
  description: 'Gestion des soirées',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const party = appConfig.features?.party;
    const channelId = party?.channelId;
    const announcementChannelId = party?.announcementChannelId;
    const roleId = party?.defaultRoleId;
    const activeEvents = await PartyService.getActiveEvents();

    const configContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎉 Soirées'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 📢 Forum des soirées\n${channelId ? `<#${channelId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_channel'))
            .setPlaceholder('Forum des soirées')
            .setChannelTypes(ChannelType.GuildForum),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 📣 Salon d'annonce\n${announcementChannelId ? `<#${announcementChannelId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_announcement'))
            .setPlaceholder("Salon d'annonce")
            .setChannelTypes(ChannelType.GuildText),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🏷️ Rôle à notifier\n${roleId ? `<@&${roleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_role'))
            .setPlaceholder('Rôle à notifier'),
        ),
      );

    // Container : soirées actives
    const listContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🗓️ Soirées actives (${activeEvents.length})`),
      );

    if (activeEvents.length > 0) {
      listContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      for (const event of activeEvents) {
        const ts = Math.floor(new Date(event.eventInfo.dateTime).getTime() / 1000);
        const statusIcon = event.status === 'started' ? '🟢' : '🟡';
        const eventId = event._id.toString();
        const participantList = event.participants.length > 0
          ? event.participants.map(id => `<@${id}>`).join(', ')
          : '*Aucun*';
        listContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${statusIcon} **${event.eventInfo.name}**\n-# ${event.eventInfo.game} · <t:${ts}:D> · ${event.participants.length}/${event.eventInfo.maxSlots} places\n-# 👥 ${participantList}`,
          ),
        );
        listContainer.addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `end_event:${eventId}`))
              .setLabel('🏁 Terminer')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `delete_event:${eventId}`))
              .setLabel('🗑️ Supprimer')
              .setStyle(ButtonStyle.Danger),
          ),
        );
      }
    } else {
      listContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent('-# *Aucune soirée active*'));
    }

    const createContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('### ➕ Créer une soirée'))
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'create_event'))
            .setLabel('🎮 Jeu connu')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'create_event_custom'))
            .setLabel('✏️ Jeu perso')
            .setStyle(ButtonStyle.Secondary),
        ),
      );

    return [configContainer, listContainer, createContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    if (action === 'create_event') {
      const games = await ChatGamingService.getAllGames().catch(() => []);

      const gameOptions = games.slice(0, 25).map(game => {
        const gameId = (game as any)._id?.toString() ?? game.name;
        return new StringSelectMenuOptionBuilder().setLabel(game.name).setValue(gameId);
      });

      const gameSelect = new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('Choisis un jeu...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(gameOptions);

      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_create_event'))
        .setTitle('Créer une soirée')
        .addComponents(
          new LabelBuilder()
            .setLabel('Jeu')
            .setStringSelectMenuComponent(gameSelect) as any,
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Nom de la soirée')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('datetime')
              .setLabel('Date et heure (JJ/MM/AAAA HH:MM)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('25/12/2025 20:00'),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('max_slots')
              .setLabel('Nombre de places')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('10'),
          ),
          new LabelBuilder()
            .setLabel('Image (optionnel)')
            .setDescription('Ajoute une image à la soirée')
            .setFileUploadComponent(
              new FileUploadBuilder().setCustomId('image').setRequired(false),
            ) as any,
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'create_event_custom') {
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_create_event_custom'))
        .setTitle('Créer une soirée')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Nom de la soirée')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('game')
              .setLabel('Jeu')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('datetime')
              .setLabel('Date et heure (JJ/MM/AAAA HH:MM)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('25/12/2025 20:00'),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('max_slots')
              .setLabel('Nombre de places')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('10'),
          ),
          new LabelBuilder()
            .setLabel('Image (optionnel)')
            .setDescription('Ajoute une image à la soirée')
            .setFileUploadComponent(
              new FileUploadBuilder().setCustomId('image').setRequired(false),
            ) as any,
        );
      await interaction.showModal(modal);
      return;
    }

    if (action.startsWith('end_event:')) {
      const eventId = action.split(':')[1];
      const event = await PartyService.getEventById(eventId);
      if (!event) {
        await interaction.reply({ content: '❌ Soirée introuvable.', flags: MessageFlags.Ephemeral });
        return;
      }

      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(panelCustomId(PANEL_ID, `select_attended:${eventId}`))
        .setPlaceholder('Participants réellement présents')
        .setMinValues(0)
        .setMaxValues(25);

      if (event.participants.length > 0) {
        userSelect.setDefaultUsers(event.participants.slice(0, 25));
      }

      cacheAttended(eventId, event.participants.slice(0, 25));

      await interaction.reply({
        content: `### 🏁 Terminer **${event.eventInfo.name}**\nSélectionne les membres **réellement présents**, puis clique sur **Valider** :`,
        components: [
          new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `confirm_end:${eventId}`))
              .setLabel('✅ Valider')
              .setStyle(ButtonStyle.Success),
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action.startsWith('confirm_end:')) {
      const eventId = action.split(':')[1];
      const attendedIds = getAttended(eventId);

      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, `modal_end_event:${eventId}`))
        .setTitle('Récompenses de fin de soirée')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('money')
              .setLabel('Argent par personne (0 = aucun)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('0'),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('xp')
              .setLabel('XP par personne (0 = aucun)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('0'),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action.startsWith('delete_event:')) {
      const eventId = action.split(':')[1];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await PartyService.deleteEvent(client, eventId);
        await interaction.editReply({ content: '✅ Soirée supprimée.' });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch {
        await interaction.editReply({ content: '❌ Erreur lors de la suppression.' });
      }
    }
  },

  async handleSelectMenu(
    interaction: StringSelectMenuInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction | UserSelectMenuInteraction,
    client: BotClient,
  ): Promise<void> {
    const action = interaction.customId.split(':')[2];
    const value = interaction.values[0];

    if (action === 'select_attended') {
      const eventId = interaction.customId.split(':')[3];
      const attendedIds = (interaction as UserSelectMenuInteraction).values;
      cacheAttended(eventId, attendedIds);
      await (interaction as UserSelectMenuInteraction).deferUpdate();
      return;
    }

    const appConfig = await AppConfigService.getOrCreateConfig();
    if (!appConfig.features.party) {
      appConfig.features.party = { enabled: false, channelId: '' } as any;
    }

    if (action === 'select_channel') {
      appConfig.features.party!.channelId = value;
      await appConfig.save();
      await interaction.reply({ content: `✅ Forum des soirées : <#${value}>`, flags: MessageFlags.Ephemeral });
    } else if (action === 'select_announcement') {
      appConfig.features.party!.announcementChannelId = value;
      await appConfig.save();
      await interaction.reply({ content: `✅ Salon d'annonce : <#${value}>`, flags: MessageFlags.Ephemeral });
    } else if (action === 'select_role') {
      appConfig.features.party!.defaultRoleId = value;
      await appConfig.save();
      await interaction.reply({ content: `✅ Rôle à notifier : <@&${value}>`, flags: MessageFlags.Ephemeral });
    }

    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },

  async handleModal(interaction: ModalSubmitInteraction, client: BotClient): Promise<void> {
    const parts = interaction.customId.split(':');
    const modalType = parts[2];

    // ── Fin de soirée ──────────────────────────────────────────────────────────
    if (modalType === 'modal_end_event') {
      const eventId = parts[3];
      const attendedIds = getAttended(parts[3]);

      const moneyRaw = interaction.fields.getTextInputValue('money').trim();
      const xpRaw = interaction.fields.getTextInputValue('xp').trim();

      const money = parseInt(moneyRaw, 10);
      const xp = parseInt(xpRaw, 10);

      if (isNaN(money) || money < 0) {
        await interaction.reply({ content: '❌ Montant d\'argent invalide.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (isNaN(xp) || xp < 0) {
        await interaction.reply({ content: '❌ Montant d\'XP invalide.', flags: MessageFlags.Ephemeral });
        return;
      }

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await PartyService.endEvent(client, eventId, {
          attendedParticipants: attendedIds,
          rewardAmount: money,
          xpAmount: xp,
        });
        const summary = attendedIds.length > 0
          ? `👥 ${attendedIds.map(id => `<@${id}>`).join(', ')}`
          : '*(aucun participant présent)*';
        await interaction.editReply({
          content: `✅ Soirée terminée !\n${summary}\n💰 ${money} · ⭐ ${xp} XP / personne`,
        });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[PartyPanel] Erreur fin soirée:', err);
        await interaction.editReply({ content: '❌ Erreur lors de la clôture de la soirée.' });
      }
      return;
    }

    // ── Création de soirée (jeu de la liste) ─────────────────────────────────
    if (modalType === 'modal_create_event') {
      const name = interaction.fields.getTextInputValue('name').trim();
      const datetimeRaw = interaction.fields.getTextInputValue('datetime').trim();
      const maxSlotsRaw = interaction.fields.getTextInputValue('max_slots').trim();
      const imageUrl = interaction.fields.getUploadedFiles('image')?.first()?.url;

      const gameRef = (interaction.fields as any).getStringSelectValues('game_select')?.[0] as string | undefined;
      if (!gameRef) {
        await interaction.reply({ content: '❌ Sélectionne un jeu dans la liste.', flags: MessageFlags.Ephemeral });
        return;
      }
      const game = await ChatGamingService.getGameById(gameRef).catch(() => null);

      await _createEvent(interaction, client, {
        name,
        game: game?.name ?? gameRef,
        datetimeRaw,
        maxSlotsRaw,
        imageUrl,
        chatGamingGameId: game ? gameRef : undefined,
      });
      return;
    }

    // ── Création de soirée (jeu personnalisé) ────────────────────────────────
    if (modalType === 'modal_create_event_custom') {
      const name = interaction.fields.getTextInputValue('name').trim();
      const game = interaction.fields.getTextInputValue('game').trim();
      const datetimeRaw = interaction.fields.getTextInputValue('datetime').trim();
      const maxSlotsRaw = interaction.fields.getTextInputValue('max_slots').trim();
      const imageUrl = interaction.fields.getUploadedFiles('image')?.first()?.url;

      await _createEvent(interaction, client, {
        name,
        game,
        datetimeRaw,
        maxSlotsRaw,
        imageUrl,
      });
      return;
    }
  },
};
