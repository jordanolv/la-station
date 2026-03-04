import { prop, getModelForClass, modelOptions, DocumentType } from '@typegoose/typegoose';

class PanelEntry {
  @prop({ required: true })
  threadId!: string;

  @prop({ required: true })
  messageId!: string;
}

@modelOptions({ options: { allowMixed: 0 } })
export class ConfigPanelState {
  @prop()
  forumChannelId?: string;

  @prop()
  logsThreadId?: string;

  @prop({ type: () => Map, default: new Map() })
  panels!: Map<string, PanelEntry>;
}

const ConfigPanelModel = getModelForClass(ConfigPanelState, {
  schemaOptions: { collection: 'config_panel', timestamps: true },
  options: { allowMixed: 0 },
});

export type IConfigPanelState = DocumentType<ConfigPanelState>;
export default ConfigPanelModel;
