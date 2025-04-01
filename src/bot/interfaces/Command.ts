import { Message } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  execute: (message: Message, args: string[]) => Promise<void> | void;
}