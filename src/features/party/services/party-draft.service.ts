import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from 'discord.js';
import { panelCustomId } from '../../config-panel/services/config-panel.registry';

const PANEL_ID = 'party';
const TTL_MS = 30 * 60 * 1000;

export interface EventDraft {
  name?: string;
  game?: string;
  chatGamingGameId?: string;
  description?: string;
  dateTime?: Date;
  maxSlots?: number;
  image?: string;
  color?: string;
  expiresAt: number;
}

export class PartyDraftService {
  private static drafts = new Map<string, EventDraft>();

  static create(userId: string): EventDraft {
    const draft: EventDraft = { expiresAt: Date.now() + TTL_MS };
    this.drafts.set(userId, draft);
    return draft;
  }

  static get(userId: string): EventDraft | null {
    const draft = this.drafts.get(userId);
    if (!draft) return null;
    if (Date.now() > draft.expiresAt) {
      this.drafts.delete(userId);
      return null;
    }
    return draft;
  }

  static update(userId: string, fields: Partial<Omit<EventDraft, 'expiresAt'>>): EventDraft | null {
    const draft = this.get(userId);
    if (!draft) return null;
    Object.assign(draft, fields, { expiresAt: Date.now() + TTL_MS });
    return draft;
  }

  static delete(userId: string): void {
    this.drafts.delete(userId);
  }

  static isComplete(draft: EventDraft): boolean {
    return !!(draft.name && draft.game && draft.dateTime);
  }

  static buildPreviewMessage(draft: EventDraft): { components: ContainerBuilder[]; flags: number } {
    const complete = this.isComplete(draft);
    const accentColor = draft.color
      ? parseInt(draft.color.replace('#', ''), 16)
      : (complete ? 0x57f287 : 0x5865f2);
    const container = new ContainerBuilder().setAccentColor(accentColor);

    // Image en plein format si disponible
    if (draft.image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(draft.image),
        ),
      );
    }

    // Titre + statut
    const title = draft.name ? `# 🎉 ${draft.name}` : `# 🎉 *Nouvelle soirée...*`;
    const statusLine = complete
      ? `-# ✨ Prêt à publier !`
      : `-# ⚠️ Complète les champs requis pour pouvoir publier`;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${title}\n${statusLine}`),
    );

    if (draft.description) {
      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(draft.description));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Infos de la soirée
    const lines: string[] = [];
    lines.push(draft.game ? `🎮 **${draft.game}**` : `🎮 *Jeu non défini*`);
    lines.push(
      draft.dateTime
        ? `📅 <t:${Math.floor(draft.dateTime.getTime() / 1000)}:F>`
        : `📅 *Date non définie*`,
    );
    lines.push(draft.maxSlots ? `👥 **${draft.maxSlots}** places` : `👥 Sans limite`);
    if (draft.image) lines.push(`🖼️ *Image ajoutée*`);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n')),
    );

    // Checklist champs requis
    const checks = [
      `${draft.name ? '✅' : '🔲'} Nom`,
      `${draft.game ? '✅' : '🔲'} Jeu`,
      `${draft.dateTime ? '✅' : '🔲'} Date`,
    ].join('　·　');

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${checks}`),
      );

    const buttonsContainer = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_name'))
            .setLabel('✏️ Nom')
            .setStyle(draft.name ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_game'))
            .setLabel('🎮 Jeu')
            .setStyle(draft.game ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_datetime'))
            .setLabel('📅 Date')
            .setStyle(draft.dateTime ? ButtonStyle.Success : ButtonStyle.Secondary),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_slots'))
            .setLabel('👥 Places')
            .setStyle(draft.maxSlots ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_description'))
            .setLabel('📝 Description')
            .setStyle(draft.description ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_image'))
            .setLabel('🖼️ Image')
            .setStyle(draft.image ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_color'))
            .setLabel('🎨 Couleur')
            .setStyle(draft.color ? ButtonStyle.Success : ButtonStyle.Secondary),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_publish'))
            .setLabel('🚀 Publier')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!complete),
          new ButtonBuilder()
            .setCustomId(panelCustomId(PANEL_ID, 'draft_cancel'))
            .setLabel('✖ Annuler')
            .setStyle(ButtonStyle.Danger),
        ),
      );

    return {
      components: [container, buttonsContainer] as any,
      flags: MessageFlags.IsComponentsV2,
    };
  }
}
