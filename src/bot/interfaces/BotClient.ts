import { Client, Collection } from 'discord.js';
import { Command } from './Command';
import { SlashCommand } from './SlashCommand';

export interface BotClient extends Client {
  commands: Collection<string, Command>;
  slashCommands: Collection<string, SlashCommand>;
}