import { prop, getModelForClass } from '@typegoose/typegoose';
import { DocumentType } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import { GeneratedPersonalityTest } from '../services/personality-test-generator.service';

export class PersonalityTestSession {
  @prop({ required: true })
  testId!: string;

  @prop({ required: true })
  subject!: string;

  @prop({ required: true })
  channelId!: string;

  @prop({ required: true })
  resultMessageId!: string;

  @prop()
  threadId?: string;

  @prop({ type: () => mongoose.Schema.Types.Mixed, required: true })
  testData!: GeneratedPersonalityTest;

  @prop({ default: () => new Date() })
  createdAt!: Date;
}

const PersonalityTestSessionModel = getModelForClass(PersonalityTestSession, {
  schemaOptions: { collection: 'personality_test_sessions' },
});

export type IPersonalityTestSession = DocumentType<PersonalityTestSession>;
export default PersonalityTestSessionModel;
