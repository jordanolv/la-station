import { EventEmitter } from 'node:events';

export interface BotEventMap {}

export type BotEventName = keyof BotEventMap;

type Listener<K extends BotEventName> = (payload: BotEventMap[K]) => void | Promise<void>;

class TypedBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends BotEventName>(event: K, listener: Listener<K>): void {
    this.emitter.on(event as string, listener as (payload: unknown) => void);
  }

  off<K extends BotEventName>(event: K, listener: Listener<K>): void {
    this.emitter.off(event as string, listener as (payload: unknown) => void);
  }

  emit<K extends BotEventName>(event: K, payload: BotEventMap[K]): void {
    const listeners = this.emitter.listeners(event as string) as Array<Listener<K>>;
    for (const listener of listeners) {
      Promise.resolve()
        .then(() => listener(payload))
        .catch(err => console.error(`[BotEventBus] listener for "${String(event)}" threw:`, err));
    }
  }
}

export const BotEventBus = new TypedBus();
