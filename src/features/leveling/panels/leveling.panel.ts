import {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';

const PANEL_ID = 'leveling';

export const levelingPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Leveling',
  emoji: '📈',
  description: 'Système de niveaux et XP',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const lv = appConfig.features?.leveling;
    const enabled = lv?.enabled ?? false;
    const taux = lv?.taux ?? 1;
    const notifLevelUp = lv?.notifLevelUp ?? true;

    const accent = enabled ? 0x57f287 : 0xed4245;

    const container = new ContainerBuilder()
      .setAccentColor(accent)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 📈 Leveling'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Statut\n${enabled ? '✅ Activé' : '❌ Désactivé'}`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'toggle'))
              .setLabel(enabled ? 'Désactiver' : 'Activer')
              .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ⚡ Taux XP\nMultiplicateur : **x${taux}**`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'edit_taux'))
              .setLabel('Modifier')
              .setStyle(ButtonStyle.Secondary),
          ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### 🔔 Notifications level-up\n${notifLevelUp ? '✅ Activées' : '❌ Désactivées'}`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, 'toggle_notif'))
              .setLabel(notifLevelUp ? 'Désactiver' : 'Activer')
              .setStyle(ButtonStyle.Secondary),
          ),
      )

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];

    if (action === 'toggle') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      if (!appConfig.features.leveling) {
        appConfig.features.leveling = { enabled: false, taux: 1, notifLevelUp: true } as any;
      }
      appConfig.features.leveling!.enabled = !appConfig.features.leveling!.enabled;
      await appConfig.save();

      const now = appConfig.features.leveling!.enabled;
      await interaction.reply({ content: now ? '✅ Leveling activé !' : '❌ Leveling désactivé.', flags: MessageFlags.Ephemeral });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }

    if (action === 'toggle_notif') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      if (!appConfig.features.leveling) {
        appConfig.features.leveling = { enabled: false, taux: 1, notifLevelUp: true } as any;
      }
      appConfig.features.leveling!.notifLevelUp = !appConfig.features.leveling!.notifLevelUp;
      await appConfig.save();

      const now = appConfig.features.leveling!.notifLevelUp;
      await interaction.reply({
        content: now ? '🔔 Notifications level-up activées.' : '🔕 Notifications level-up désactivées.',
        ephemeral: true,
      });
      await ConfigPanelService.refreshPanel(client, PANEL_ID);
    }

    if (action === 'edit_taux') {
      const appConfig = await AppConfigService.getOrCreateConfig();
      const modal = new ModalBuilder()
        .setCustomId(panelCustomId(PANEL_ID, 'modal_taux'))
        .setTitle('Modifier le taux XP')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('taux')
              .setLabel('Multiplicateur XP (ex: 1, 1.5, 2)')
              .setStyle(TextInputStyle.Short)
              .setMaxLength(5)
              .setValue(String(appConfig.features?.leveling?.taux ?? 1))
              .setRequired(true),
          ),
        );
      await interaction.showModal(modal);
    }
  },

  async handleModal(interaction: ModalSubmitInteraction, client: BotClient): Promise<void> {
    const raw = interaction.fields.getTextInputValue('taux').trim();
    const taux = parseFloat(raw);
    if (isNaN(taux) || taux <= 0 || taux > 10) {
      await interaction.reply({ content: '❌ Valeur invalide. Entrez un nombre entre 0.1 et 10.', flags: MessageFlags.Ephemeral });
      return;
    }

    const appConfig = await AppConfigService.getOrCreateConfig();
    if (!appConfig.features.leveling) {
      appConfig.features.leveling = { enabled: false, taux: 1, notifLevelUp: true } as any;
    }
    appConfig.features.leveling!.taux = taux;
    await appConfig.save();

    await interaction.reply({ content: `✅ Taux XP mis à jour : **x${taux}**`, flags: MessageFlags.Ephemeral });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
