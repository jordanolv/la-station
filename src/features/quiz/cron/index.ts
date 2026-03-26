import { BotClient } from '../../../bot/client';
import { QuizCron } from './quiz.cron';

export class QuizCronManager {
  private quizCron: QuizCron;

  constructor(client: BotClient) {
    this.quizCron = new QuizCron(client);
  }

  public start(): void {
    this.quizCron.start();
  }

  public stop(): void {
    this.quizCron.stop();
  }
}
