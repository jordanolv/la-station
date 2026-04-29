import PersonalityTestSessionModel, { IPersonalityTestSession } from '../models/personality-test-session.model';
import { GeneratedPersonalityTest } from '../services/personality-test-generator.service';

export class PersonalityTestSessionRepository {
  static async create(data: {
    testId: string;
    subject: string;
    channelId: string;
    resultMessageId: string;
    threadId: string;
    testData: GeneratedPersonalityTest;
  }): Promise<IPersonalityTestSession> {
    return PersonalityTestSessionModel.create(data);
  }

  static async findAll(): Promise<IPersonalityTestSession[]> {
    return PersonalityTestSessionModel.find().sort({ createdAt: -1 });
  }

  static async delete(testId: string): Promise<void> {
    await PersonalityTestSessionModel.deleteOne({ testId });
  }
}
