import { Message } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  usage: string;
  roles?: string[]; // Liste des IDs des rôles autorisés
  execute: (message: Message, args: string[]) => Promise<void>;
} 