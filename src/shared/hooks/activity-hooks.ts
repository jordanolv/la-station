type MessageActivityHook = (userId: string, points: number) => void;

/**
 * Pont découplé entre le tracking de messages (StatsService)
 * et les features qui veulent réagir aux slots de messages validés.
 */
export class ActivityHooks {
  private static messageHooks: MessageActivityHook[] = [];

  static onMessageActivity(hook: MessageActivityHook): void {
    this.messageHooks.push(hook);
  }

  static notifyMessageActivity(userId: string, points: number): void {
    for (const hook of this.messageHooks) {
      try { hook(userId, points); } catch {}
    }
  }
}
