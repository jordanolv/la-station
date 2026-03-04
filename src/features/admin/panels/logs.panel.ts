import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ConfigPanel } from '../../config-panel/services/config-panel.registry';

const PANEL_ID = 'logs';
const ACCENT = 0x5865f2;

export const logsPanel: ConfigPanel = {
  id: PANEL_ID,
  title: 'Logs',
  emoji: '📋',
  description: 'Logs automatiques du serveur',

  async buildContainers(_client: BotClient): Promise<ContainerBuilder[]> {
    const container = new ContainerBuilder()
      .setAccentColor(ACCENT)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 📋 Logs'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Les logs sont actifs et envoyés automatiquement.'),
      );

    return [container];
  },
};
