// discord-client.d.ts
import { Command } from '../src/bot-todel/interfaces/Command';
import { SlashCommand } from '../src/bot-todel/interfaces/SlashCommand';
import { Collection } from "discord.js";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    slashCommands: Collection<string, SlashCommand>;
    database: any;
    instance: boolean;
  }

}