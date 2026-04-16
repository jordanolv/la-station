import { prop } from '@typegoose/typegoose';

export class SuggestionConfig {
  @prop({ default: false })
  enabled!: boolean;

  @prop({ type: () => [String], default: () => [] })
  channels!: string[];
}

export type ISuggestionConfig = SuggestionConfig;
