import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
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
import { PartyDraftService } from '../services/party-draft.service';
import { uploadFromUrl } from '../../../shared/cloudinary';

const PANEL_ID = 'party';

// ─── Cache participants présents (TTL 10 min) ──────────────────────────────
const attendedCache = new Map<string, { ids: string[]; expiresAt: number }>();
function cacheAttended(eventId: string, ids: string[]): void {
  attendedCache.set(eventId, { ids, expiresAt: Date.now() + 10 * 60 * 1000 });
}
function getAttended(eventId: string): string[] {
  const entry = attendedCache.get(eventId);
  if (!entry || Date.now() > entry.expiresAt) return [];
  return entry.ids;
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
        new TextDisplayBuilder().setContent(`### 🏷️ Rôle à notifier\n${roleId ? `<@&${roleId}>` : '*Non défini*'}`),
      )
      .addActionRowComponents(
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'select_role'))
            .setPlaceholder('Rôle à notifier'),
        ),
      );

    const listContainer = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🗓️ Soirées actives (${activeEvents.length})`),
      );

    if (activeEvents.length > 0) {
      listContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      const visibleEvents = activeEvents.slice(0, 3);
      for (const event of visibleEvents) {
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
            ...(event.status === 'pending' ? [
              new ButtonBuilder()
                .setCustomId(panelCustomId(PANEL_ID, `start_event:${eventId}`))
                .setLabel('▶️ Démarrer')
                .setStyle(ButtonStyle.Primary),
            ] : []),
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `end_event:${eventId}`))
              .setLabel('🏁 Terminer')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `delete_event:${eventId}`))
              .setLabel('🗑️ Supprimer')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `set_image:${eventId}`))
              .setLabel('🖼️')
              .setStyle(ButtonStyle.Secondary),
          ),
        );
      }
      if (activeEvents.length > 3) {
        listContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# *+ ${activeEvents.length - 3} autre(s) soirée(s) non affichée(s)*`),
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
            .setCustomId(panelCustomId(PANEL_ID, 'new_event'))
            .setLabel('🎉 Nouvelle soirée')
            .setStyle(ButtonStyle.Primary),
        ),
      );

    return [configContainer, listContainer, createContainer];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':').slice(2).join(':');

    // ─── Création : draft builder ────────────────────────────────────────────

    if (action === 'new_event') {
      const draft = PartyDraftService.create(interaction.user.id);
      const preview = PartyDraftService.buildPreviewMessage(draft);
      await interaction.reply({ ...preview, flags: preview.flags | MessageFlags.Ephemeral } as any);
      return;
    }

    if (action === 'draft_name') {
      const draft = PartyDraftService.get(interaction.user.id);
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_name'))
        .setTitle('Nom de la soirée')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('name')
              .setLabel('Nom de la soirée')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100)
              .setValue(draft?.name ?? ''),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_game') {
      const draft = PartyDraftService.get(interaction.user.id);
      const games = await ChatGamingService.getAllGames().catch(() => []);
      const gameOptions = [
        ...games.slice(0, 24).map(game => {
          const gameId = (game as any)._id?.toString() ?? game.name;
          return new StringSelectMenuOptionBuilder().setLabel(game.name).setValue(gameId);
        }),
        new StringSelectMenuOptionBuilder()
          .setLabel('🖊️ Jeu personnalisé...')
          .setDescription('Remplis le champ texte ci-dessous')
          .setValue('__custom__'),
      ];

      const components: any[] = [];
      if (gameOptions.length > 0) {
        components.push(
          new LabelBuilder()
            .setLabel('Jeu connu')
            .setStringSelectMenuComponent(
              new StringSelectMenuBuilder()
                .setCustomId('game_select')
                .setPlaceholder('Choisis dans la liste...')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(gameOptions),
            ) as any,
        );
      }
      components.push(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('game_custom')
            .setLabel('Jeu personnalisé (prioritaire sur la liste)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(50)
            .setValue(draft?.chatGamingGameId ? '' : (draft?.game ?? '')),
        ),
      );

      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_game'))
        .setTitle('Jeu de la soirée')
        .addComponents(...components);
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_datetime') {
      const draft = PartyDraftService.get(interaction.user.id);
      const pad = (n: number) => String(n).padStart(2, '0');
      let currentValue: string;
      if (draft?.dateTime) {
        const d = draft.dateTime;
        currentValue = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } else {
        const now = new Date();
        currentValue = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} 21:00`;
      }
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_datetime'))
        .setTitle('Date et heure')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('datetime')
              .setLabel('Date et heure (JJ/MM/AAAA HH:MM)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('25/12/2025 20:00')
              .setValue(currentValue),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_slots') {
      const draft = PartyDraftService.get(interaction.user.id);
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_slots'))
        .setTitle('Nombre de places')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('slots')
              .setLabel('Nombre de places (1–50)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('10')
              .setValue(draft?.maxSlots ? String(draft.maxSlots) : ''),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_description') {
      const draft = PartyDraftService.get(interaction.user.id);
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_description'))
        .setTitle('Description')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description (optionnel)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500)
              .setValue(draft?.description ?? ''),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_color') {
      const draft = PartyDraftService.get(interaction.user.id);
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_color'))
        .setTitle('Couleur de la soirée')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('color')
              .setLabel('Code hexadécimal (ex: #FF6B6B)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(7)
              .setPlaceholder('#FF6B6B')
              .setValue(draft?.color ?? ''),
          ),
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_image') {
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_draft_image'))
        .setTitle('Image de la soirée')
        .addComponents(
          new LabelBuilder()
            .setLabel('Image (optionnel)')
            .setFileUploadComponent(
              new FileUploadBuilder().setCustomId('image').setRequired(false),
            ) as any,
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === 'draft_publish') {
      const draft = PartyDraftService.get(interaction.user.id);
      if (!draft || !PartyDraftService.isComplete(draft)) {
        await interaction.reply({ content: '❌ Remplis tous les champs requis avant de publier.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferUpdate();
      const appConfig = await AppConfigService.getOrCreateConfig();
      const channelId = appConfig.features?.party?.channelId;
      if (!channelId) {
        await interaction.editReply({ content: '❌ Aucun forum configuré pour les soirées.', components: [], flags: MessageFlags.IsComponentsV2 } as any);
        return;
      }
      try {
        const event = await PartyService.createEvent(client, {
          name: draft.name!,
          game: draft.game!,
          description: draft.description,
          dateTime: draft.dateTime!,
          maxSlots: draft.maxSlots ?? 100,
          color: draft.color,
          image: draft.image,
          channelId,
          createdBy: interaction.user.id,
          chatGamingGameId: draft.chatGamingGameId,
        });
        PartyDraftService.delete(interaction.user.id);
        await interaction.editReply({
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`✅ Soirée **${event.eventInfo.name}** créée et publiée !`),
            ),
          ],
        } as any);
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[PartyPanel] Erreur publication soirée:', err);
        await interaction.editReply({
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent('❌ Erreur lors de la publication.'),
            ),
          ],
        } as any);
      }
      return;
    }

    if (action === 'draft_cancel') {
      PartyDraftService.delete(interaction.user.id);
      await interaction.update({
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent('❌ Création annulée.'),
          ),
        ],
      } as any);
      return;
    }

    // ─── Gestion des soirées existantes ─────────────────────────────────────

    if (action.startsWith('set_image:')) {
      const eventId = action.split(':')[1];
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, `modal_set_image:${eventId}`))
        .setTitle('Image de la soirée')
        .addComponents(
          new LabelBuilder()
            .setLabel('Image')
            .setFileUploadComponent(
              new FileUploadBuilder().setCustomId('image').setRequired(true),
            ) as any,
        );
      await interaction.showModal(modal);
      return;
    }

    if (action.startsWith('start_event:')) {
      const eventId = action.split(':')[1];
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const event = await PartyService.startEvent(client, eventId);
        const bannerNote = event.eventInfo.image ? '\n🖼️ Banner du serveur mis à jour.' : '';
        await interaction.editReply({ content: `✅ Soirée **${event.eventInfo.name}** démarrée !${bannerNote}` });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[PartyPanel] Erreur démarrage soirée:', err);
        await interaction.editReply({ content: '❌ Erreur lors du démarrage de la soirée.' });
      }
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
      cacheAttended(eventId, (interaction as UserSelectMenuInteraction).values);
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
    const userId = interaction.user.id;

    // ─── Draft : nom ─────────────────────────────────────────────────────────
    if (modalType === 'modal_draft_name') {
      const name = interaction.fields.getTextInputValue('name').trim();
      const draft = PartyDraftService.update(userId, { name });
      if (!draft) { await interaction.reply({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await (interaction as any).update(PartyDraftService.buildPreviewMessage(draft));
      return;
    }

    // ─── Draft : jeu ─────────────────────────────────────────────────────────
    if (modalType === 'modal_draft_game') {
      await interaction.deferUpdate();
      const customGame = interaction.fields.getTextInputValue('game_custom').trim();
      const gameRef = (interaction.fields as any).getStringSelectValues?.('game_select')?.[0] as string | undefined;

      let game: string | undefined;
      let chatGamingGameId: string | undefined;

      if (customGame) {
        game = customGame;
      } else if (gameRef && gameRef !== '__custom__') {
        const chatGame = await ChatGamingService.getGameById(gameRef).catch(() => null);
        game = chatGame?.name ?? gameRef;
        chatGamingGameId = gameRef;
      }

      if (!game) {
        await interaction.followUp({ content: '❌ Sélectionne un jeu ou saisis un nom.', flags: MessageFlags.Ephemeral });
        return;
      }

      const draft = PartyDraftService.update(userId, { game, chatGamingGameId });
      if (!draft) { await interaction.followUp({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await interaction.editReply(PartyDraftService.buildPreviewMessage(draft) as any);
      return;
    }

    // ─── Draft : date ─────────────────────────────────────────────────────────
    if (modalType === 'modal_draft_datetime') {
      const datetimeRaw = interaction.fields.getTextInputValue('datetime').trim();
      const dateMatch = datetimeRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
      if (!dateMatch) {
        await interaction.reply({ content: '❌ Format invalide. Utilise `JJ/MM/AAAA HH:MM`.', flags: MessageFlags.Ephemeral });
        return;
      }
      const [, dd, mm, yyyy, hh, min] = dateMatch;
      const dateTime = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
      if (isNaN(dateTime.getTime()) || dateTime < new Date()) {
        await interaction.reply({ content: '❌ Date invalide ou dans le passé.', flags: MessageFlags.Ephemeral });
        return;
      }
      const draft = PartyDraftService.update(userId, { dateTime });
      if (!draft) { await interaction.reply({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await (interaction as any).update(PartyDraftService.buildPreviewMessage(draft));
      return;
    }

    // ─── Draft : places ───────────────────────────────────────────────────────
    if (modalType === 'modal_draft_slots') {
      const maxSlots = parseInt(interaction.fields.getTextInputValue('slots').trim(), 10);
      if (isNaN(maxSlots) || maxSlots < 1 || maxSlots > 50) {
        await interaction.reply({ content: '❌ Le nombre de places doit être entre 1 et 50.', flags: MessageFlags.Ephemeral });
        return;
      }
      const draft = PartyDraftService.update(userId, { maxSlots });
      if (!draft) { await interaction.reply({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await (interaction as any).update(PartyDraftService.buildPreviewMessage(draft));
      return;
    }

    // ─── Draft : description ──────────────────────────────────────────────────
    if (modalType === 'modal_draft_description') {
      const description = interaction.fields.getTextInputValue('description').trim() || undefined;
      const draft = PartyDraftService.update(userId, { description });
      if (!draft) { await interaction.reply({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await (interaction as any).update(PartyDraftService.buildPreviewMessage(draft));
      return;
    }

    // ─── Draft : couleur ─────────────────────────────────────────────────────
    if (modalType === 'modal_draft_color') {
      const raw = interaction.fields.getTextInputValue('color').trim();
      const color = raw ? (raw.startsWith('#') ? raw : `#${raw}`) : undefined;
      if (color && !/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(color)) {
        await interaction.reply({ content: '❌ Code couleur invalide. Utilise un format hex valide (ex: `#FF6B6B`).', flags: MessageFlags.Ephemeral });
        return;
      }
      const draft = PartyDraftService.update(userId, { color });
      if (!draft) { await interaction.reply({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await (interaction as any).update(PartyDraftService.buildPreviewMessage(draft));
      return;
    }

    // ─── Draft : image ────────────────────────────────────────────────────────
    if (modalType === 'modal_draft_image') {
      const discordUrl = interaction.fields.getUploadedFiles('image')?.first()?.url;
      await interaction.deferUpdate();
      let imageUrl: string | undefined;
      if (discordUrl) {
        imageUrl = await uploadFromUrl(discordUrl, 'the-ridge/party', `party_${Date.now()}`);
      }
      const draft = PartyDraftService.update(userId, { image: imageUrl });
      if (!draft) { await interaction.followUp({ content: '❌ Draft expiré, recommence.', flags: MessageFlags.Ephemeral }); return; }
      await interaction.editReply(PartyDraftService.buildPreviewMessage(draft) as any);
      return;
    }

    // ─── Fin de soirée ────────────────────────────────────────────────────────
    if (modalType === 'modal_end_event') {
      const eventId = parts[3];
      const attendedIds = getAttended(eventId);
      const money = parseInt(interaction.fields.getTextInputValue('money').trim(), 10);
      const xp = parseInt(interaction.fields.getTextInputValue('xp').trim(), 10);

      if (isNaN(money) || money < 0) {
        await interaction.reply({ content: "❌ Montant d'argent invalide.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (isNaN(xp) || xp < 0) {
        await interaction.reply({ content: "❌ Montant d'XP invalide.", flags: MessageFlags.Ephemeral });
        return;
      }

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await PartyService.endEvent(client, eventId, { attendedParticipants: attendedIds, rewardAmount: money, xpAmount: xp });
        const summary = attendedIds.length > 0 ? `👥 ${attendedIds.map(id => `<@${id}>`).join(', ')}` : '*(aucun participant présent)*';
        await interaction.editReply({ content: `✅ Soirée terminée !\n${summary}\n💰 ${money} · ⭐ ${xp} XP / personne` });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[PartyPanel] Erreur fin soirée:', err);
        await interaction.editReply({ content: '❌ Erreur lors de la clôture de la soirée.' });
      }
      return;
    }

    // ─── Image soirée existante ───────────────────────────────────────────────
    if (modalType === 'modal_set_image') {
      const eventId = parts[3];
      const discordUrl = interaction.fields.getUploadedFiles('image')?.first()?.url;
      if (!discordUrl) {
        await interaction.reply({ content: '❌ Aucune image reçue.', flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const imageUrl = await uploadFromUrl(discordUrl, 'the-ridge/party', `party_${Date.now()}`);
        await PartyService.updateEventImage(client, eventId, imageUrl);
        await interaction.editReply({ content: '✅ Image mise à jour !' });
        await ConfigPanelService.refreshPanel(client, PANEL_ID);
      } catch (err) {
        console.error('[PartyPanel] Erreur image soirée:', err);
        await interaction.editReply({ content: "❌ Erreur lors de la mise à jour de l'image." });
      }
      return;
    }
  },
};
