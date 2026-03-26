import QuizConfigModel, { IQuizConfigDoc } from '../models/quiz-config.model';

export class QuizConfigRepository {
  static async getOrCreate(): Promise<IQuizConfigDoc> {
    const existing = await QuizConfigModel.findOne();
    if (existing) return existing;
    return QuizConfigModel.create({ usedQuestionIds: [], activeAnswers: {} });
  }

  static async markQuestionUsed(questionId: string): Promise<void> {
    const doc = await this.getOrCreate();
    if (!doc.usedQuestionIds.includes(questionId)) {
      doc.usedQuestionIds.push(questionId);
      doc.markModified('usedQuestionIds');
      await doc.save();
    }
  }

  static async resetUsedQuestions(): Promise<void> {
    const doc = await this.getOrCreate();
    doc.usedQuestionIds = [];
    doc.markModified('usedQuestionIds');
    await doc.save();
  }

  static async setActiveQuestion(messageId: string, questionId: string, activeUntil: Date): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeMessageId = messageId;
    doc.activeQuestionId = questionId;
    doc.activeUntil = activeUntil;
    doc.activeAnswers = {};
    doc.firstCorrectUserId = undefined;
    doc.markModified('activeAnswers');
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
    doc.activeQuestionId = undefined;
    doc.activeUntil = undefined;
    doc.activeAnswers = {};
    doc.firstCorrectUserId = undefined;
    doc.markModified('activeAnswers');
    await doc.save();
  }
}
