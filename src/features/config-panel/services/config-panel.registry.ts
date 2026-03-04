import {
  ContainerBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  RoleSelectMenuInteraction,
  UserSelectMenuInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';

export interface ConfigPanel {
  /** Identifiant unique du panel (ex: 'voice', 'birthday') */
  id: string;

  /** Titre du thread dans le forum */
  title: string;

  /** Emoji affiché dans le titre */
  emoji: string;

  /** Description courte du panel */
  description: string;

  /** Construit les containers V2 affichant la config et les contrôles */
  buildContainers(client: BotClient): Promise<ContainerBuilder[]>;

  /** Gère un clic sur un bouton */
  handleButton?(interaction: ButtonInteraction, client: BotClient): Promise<void>;

  /** Gère une sélection dans un select menu */
  handleSelectMenu?(
    interaction: StringSelectMenuInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction | UserSelectMenuInteraction,
    client: BotClient,
  ): Promise<void>;

  /** Gère la soumission d'un modal */
  handleModal?(interaction: ModalSubmitInteraction, client: BotClient): Promise<void>;
}

export const PANEL_BUTTON_PREFIX = 'cpanel';

export function panelCustomId(panelId: string, action: string): string {
  return `${PANEL_BUTTON_PREFIX}:${panelId}:${action}`;
}

export function parsePanelCustomId(customId: string): { panelId: string; action: string } | null {
  if (!customId.startsWith(PANEL_BUTTON_PREFIX + ':')) return null;
  const parts = customId.split(':');
  if (parts.length < 3) return null;
  return { panelId: parts[1], action: parts.slice(2).join(':') };
}

class PanelRegistry {
  private panels = new Map<string, ConfigPanel>();

  register(panel: ConfigPanel): void {
    this.panels.set(panel.id, panel);
  }

  get(id: string): ConfigPanel | undefined {
    return this.panels.get(id);
  }

  getAll(): ConfigPanel[] {
    return [...this.panels.values()];
  }
}

export const panelRegistry = new PanelRegistry();
