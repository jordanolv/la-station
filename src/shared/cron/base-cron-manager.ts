import { Client } from 'discord.js';

/**
 * Interface pour tout objet qui peut être démarré et arrêté
 */
export interface IStartStoppable {
  start(): void;
  stop(): void;
}

/**
 * Classe de base abstraite pour tous les gestionnaires de crons
 */
export abstract class BaseCronManager implements IStartStoppable {
  protected crons: IStartStoppable[] = [];
  protected client: Client;
  protected featureName: string;

  constructor(client: Client, featureName: string) {
    this.client = client;
    this.featureName = featureName;
  }

  /**
   * Démarre tous les crons gérés par ce gestionnaire
   */
  public startAll(): void {
    console.log(`Starting all ${this.featureName} cron jobs...`);
    this.crons.forEach(cron => cron.start());
  }

  /**
   * Arrête tous les crons gérés par ce gestionnaire
   */
  public stopAll(): void {
    console.log(`Stopping all ${this.featureName} cron jobs...`);
    this.crons.forEach(cron => cron.stop());
  }

  /**
   * Ajoute un cron au gestionnaire
   */
  protected addCron(cron: IStartStoppable): void {
    this.crons.push(cron);
  }

  /**
   * Implémentation de l'interface IStartStoppable
   */
  public start(): void {
    this.startAll();
  }

  /**
   * Implémentation de l'interface IStartStoppable
   */
  public stop(): void {
    this.stopAll();
  }
} 