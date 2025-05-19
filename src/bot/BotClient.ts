// BotClient.ts
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import path from 'path';
import { connectToDatabase } from './handlers/mongoose.js';
import { loadFeatures } from './handlers/feature.js';
import { REST, Routes } from 'discord.js';

export class BotClient extends Client {
  private static _instance: BotClient;
  public commands: Collection<string, any>;
  public slashCommands: Collection<string, any>;

  private constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
      ],
      partials: [
        Partials.Channel,
        Partials.Reaction,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
      ],
    });

    this.commands = new Collection();
    this.slashCommands = new Collection();
  }

  public static async init(): Promise<BotClient> {
    if (!BotClient._instance) {
      BotClient._instance = new BotClient();
    }
    return BotClient._instance;
  }

  public static getInstance(): BotClient {
    if (!BotClient._instance) {
      throw new Error("BotClient non initialisé. Appelle d'abord BotClient.init().");
    }
    return BotClient._instance;
  }
  
  // Méthode utilitaire pour récupérer une guild
  public static getGuild(id: string) {
    return BotClient.getInstance().guilds.cache.get(id);
  }
}
