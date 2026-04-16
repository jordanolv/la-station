import { prop, getModelForClass, DocumentType, modelOptions } from '@typegoose/typegoose';
import { ChatGamingConfig } from '../../chat-gaming/models/chat-gaming-config.model';
import { LevelingConfig } from '../../leveling/models/leveling-config.model';
import { VoiceConfig } from '../../voice/models/voice-config.model';
import { PartyConfig } from '../../party/models/party-config.model';
import { BirthdayConfig } from '../../user/models/birthday-config.model';
import { ArcadeConfig } from '../../arcade/models/arcade-config.model';
import { SuggestionConfig } from '../../suggestion/models/suggestion-config.model';

@modelOptions({ options: { allowMixed: 0 } })
class AppSettings {
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

  @prop({
    default: () => ({}),
    type: () => Object
  })
  commandChannels?: { [key: string]: string };

  @prop()
  originalBannerUrl?: string;
}

class AppFeatures {
  @prop({ type: () => ChatGamingConfig })
  chatGaming?: ChatGamingConfig;

  @prop({ type: () => LevelingConfig })
  leveling?: LevelingConfig;

  @prop({ type: () => VoiceConfig })
  voice?: VoiceConfig;

  @prop({ type: () => PartyConfig })
  party?: PartyConfig;

  @prop({ type: () => BirthdayConfig })
  birthday?: BirthdayConfig;

  @prop({ type: () => ArcadeConfig })
  arcade?: ArcadeConfig;

  @prop({ type: () => SuggestionConfig })
  suggestion?: SuggestionConfig;
}

export class AppConfig {
  @prop({ type: () => AppSettings, default: () => new AppSettings() })
  config!: AppSettings;

  @prop({ type: () => AppFeatures, default: () => new AppFeatures() })
  features!: AppFeatures;
}

export type IAppConfig = DocumentType<AppConfig>;

const AppConfigModel = getModelForClass(AppConfig, {
  schemaOptions: { collection: 'app_config' },
  options: { allowMixed: 0 }
});

export default AppConfigModel;
