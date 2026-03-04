import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel, panelCustomId } from '../../config-panel/services/config-panel.registry';
import { ConfigPanelService } from '../../config-panel/services/config-panel.service';
import { AppConfigService } from '../../discord/services/app-config.service';

const PANEL_ID = 'arcade';

const GAMES = [
  { key: 'shifumi', label: 'Shifumi', emoji: '✊' },
  { key: 'puissance4', label: 'Puissance 4', emoji: '🔴' },
  { key: 'morpion', label: 'Morpion', emoji: '❌' },
  { key: 'battle', label: 'Battle', emoji: '⚔️' },
] as const;

export const arcadePanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Arcade',
  emoji: '🕹️',
  description: 'Mini-jeux PvP',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const arcade = appConfig.features?.arcade;

    const container = new ContainerBuilder()
      .setAccentColor(0x5865f2)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🕹️ Arcade'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    for (let i = 0; i < GAMES.length; i++) {
      const g = GAMES[i];
      const gameConfig = arcade?.[g.key as keyof typeof arcade] as any;
      const enabled = gameConfig?.enabled ?? true;
      const total = gameConfig?.stats?.totalGames ?? 0;

      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${g.emoji} ${g.label}\n${enabled ? '✅ Activé' : '❌ Désactivé'} — **${total}** parties jouées`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(panelCustomId(PANEL_ID, `toggle_${g.key}`))
              .setLabel(enabled ? 'Désactiver' : 'Activer')
              .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
          ),
      );

      if (i < GAMES.length - 1) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
      }
    }

    return [container];
  },

  async handleButton(interaction: ButtonInteraction, client: BotClient): Promise<void> {
    const action = interaction.customId.split(':')[2];
    const match = action.match(/^toggle_(.+)$/);
    if (!match) return;

    const gameKey = match[1];
    const game = GAMES.find((g) => g.key === gameKey);
    if (!game) return;

    const appConfig = await AppConfigService.getOrCreateConfig();
    if (!appConfig.features.arcade) {
      appConfig.features.arcade = {} as any;
    }
    const arcadeData = appConfig.features.arcade as any;
    if (!arcadeData[gameKey]) {
      arcadeData[gameKey] = { enabled: true, stats: { totalGames: 0 } };
    }
    arcadeData[gameKey].enabled = !arcadeData[gameKey].enabled;
    await appConfig.save();

    const now = arcadeData[gameKey].enabled;
    await interaction.reply({
      content: `${game.emoji} **${game.label}** ${now ? 'activé' : 'désactivé'} !`,
      ephemeral: true,
    });
    await ConfigPanelService.refreshPanel(client, PANEL_ID);
  },
};
