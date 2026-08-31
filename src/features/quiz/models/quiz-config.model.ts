import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';
import { QuizQuestion } from '../services/quiz.service';

export class QuizConfig {
  @prop({ default: true })
  enabled!: boolean;

  @prop()
  activeMessageId?: string;

  /** Une question par thème proposé aujourd'hui */
  @prop({ type: () => [Object], default: [] })
  activeQuestions!: QuizQuestion[];

  @prop()
  activeUntil?: Date;

  /** Message d'annonce dans le channel général, supprimé au récap */
  @prop()
  announceMessageId?: string;

  /** userId -> questionId du thème choisi (verrouillé au premier clic) */
  @prop({ type: Object, default: {} })
  activeThemeChoices!: Record<string, string>;

  /** userId -> choiceIndex (stocké comme objet JSON) */
  @prop({ type: Object, default: {} })
  activeAnswers!: Record<string, number>;

  /** questionId -> userId du premier à avoir bien répondu */
  @prop({ type: Object, default: {} })
  firstCorrectByQuestion!: Record<string, string>;

  /** Ids des dernières questions posées (anti-répétition) */
  @prop({ type: () => [String], default: [] })
  recentQuestionTexts!: string[];
}

const QuizConfigModel = getModelForClass(QuizConfig, {
  schemaOptions: { collection: 'quiz_config', timestamps: true },
});

export type IQuizConfig = QuizConfig;
export type IQuizConfigDoc = DocumentType<QuizConfig>;
export default QuizConfigModel;
