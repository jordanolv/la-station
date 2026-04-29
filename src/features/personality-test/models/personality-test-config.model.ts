import { prop, getModelForClass } from '@typegoose/typegoose';
import { DocumentType } from '@typegoose/typegoose';

export class PersonalityTestConfig {
  @prop()
  channelId?: string;
}

const PersonalityTestConfigModel = getModelForClass(PersonalityTestConfig, {
  schemaOptions: { collection: 'personality_test_config' },
});

export type IPersonalityTestConfig = DocumentType<PersonalityTestConfig>;
export default PersonalityTestConfigModel;
