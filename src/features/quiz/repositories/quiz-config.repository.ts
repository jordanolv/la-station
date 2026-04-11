import QuizConfigModel, { IQuizConfigDoc } from '../models/quiz-config.model';
import { QuizQuestion } from '../services/quiz.service';

export class QuizConfigRepository {
  static async getOrCreate(): Promise<IQuizConfigDoc> {
    const existing = await QuizConfigModel.findOne();
    if (existing) return existing;
    return QuizConfigModel.create({ activeAnswers: {} });
  }

  static async setActiveQuestion(messageId: string, question: QuizQuestion, activeUntil: Date): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeMessageId = messageId;
    doc.activeQuestion = question;
    doc.activeUntil = activeUntil;
    doc.activeAnswers = {};
    doc.firstCorrectUserId = undefined;
    const prev = doc.recentQuestionTexts ?? [];
    doc.recentQuestionTexts = [...prev, question.question].slice(-25);
    doc.markModified('activeQuestion');
    doc.markModified('activeAnswers');
    doc.markModified('recentQuestionTexts');
    await doc.save();
  }

  static async saveAnswer(userId: string, choiceIndex: number, isFirstCorrect: boolean): Promise<void> {
    await QuizConfigModel.updateOne(
      {},
      {
        $set: {
          [`activeAnswers.${userId}`]: choiceIndex,
          ...(isFirstCorrect ? { firstCorrectUserId: userId } : {}),
        },
      },
    );
  }

  static async clearActiveQuestion(): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeMessageId = undefined;
    doc.activeQuestion = undefined;
    doc.activeUntil = undefined;
    doc.activeAnswers = {};
    doc.firstCorrectUserId = undefined;
    doc.markModified('activeAnswers');
    await doc.save();
  }
}
