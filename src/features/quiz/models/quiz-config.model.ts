import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

export class QuizConfig {
  @prop({ type: () => [String], default: [] })
  usedQuestionIds!: string[];

  @prop()
  activeMessageId?: string;

  @prop()
  activeQuestionId?: string;

  @prop()
  activeUntil?: Date;

  /** userId -> choiceIndex (stocké comme objet JSON) */
  @prop({ type: Object, default: {} })
  activeAnswers!: Record<string, number>;

  @prop()
  firstCorrectUserId?: string;
}

const QuizConfigModel = getModelForClass(QuizConfig, {
  schemaOptions: { collection: 'quiz_config', timestamps: true },
});

export type IQuizConfig = QuizConfig;
export type IQuizConfigDoc = DocumentType<QuizConfig>;
export default QuizConfigModel;
