import { Client } from 'discord.js';

export interface Event {
  name: string;
  once: boolean;
  execute: (client: Client, ...args: any[]) => Promise<void> | void;
}