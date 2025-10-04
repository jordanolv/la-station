import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';
import { ChatGamingConfig } from '../../chat-gaming/models/chatGamingConfig.model';
import { LevelingConfig } from '../../leveling/models/levelingConfig.model';
import { VocManagerConfig, IVocManager } from '../../voc-manager/models/vocManagerConfig.model';
import { PartyConfig } from '../../party/models/partyConfig.model';
import { SuggestionsConfig } from '../../suggestions/models/suggestionConfig.model';
import { BirthdayConfig } from '../../user/models/birthdayConfig.model';
import { ArcadeConfig } from '../../arcade/models/arcadeConfig.model';

class GuildConfig {
  @prop({ default: '!' })
  prefix!: string;

  @prop({ 
    default: () => ({ primary: '#dac1ff' })
  })
  colors!: Map<string, any>;

  @prop({
    default: () => ({}),
    type: () => Object
  })
  channels?: { [key: string]: string };
}

class GuildFeatures {
  @prop({ type: () => ChatGamingConfig })
  chatGaming?: ChatGamingConfig;

  @prop({ type: () => LevelingConfig })
  leveling?: LevelingConfig;

  @prop({ type: () => VocManagerConfig })
  vocManager?: IVocManager;

  @prop({ type: () => PartyConfig })
  party?: PartyConfig;

  @prop({ type: () => SuggestionsConfig })
  suggestions?: SuggestionsConfig;

  @prop({ type: () => BirthdayConfig })
  birthday?: BirthdayConfig;

  @prop({ type: () => ArcadeConfig })
  arcade?: ArcadeConfig;
}

export class Guild {
  @prop({ required: true, unique: true })
  guildId!: string;

  @prop({ required: true })
  name!: string;

  @prop({ default: () => new Date() })
  registeredAt!: Date;

  @prop({ type: () => GuildConfig, default: () => new GuildConfig() })
  config!: GuildConfig;

  @prop({ type: () => GuildFeatures, default: () => new GuildFeatures() })
  features!: GuildFeatures;
}

// Types pour la compatibilité
export type IGuild = DocumentType<Guild>;

// Créer le modèle avec Typegoose
const GuildModel = getModelForClass(Guild, {
  schemaOptions: { collection: 'guilds' },
  options: { allowMixed: 0 } // Supprime les warnings "Setting Mixed for property"
});

export default GuildModel; 