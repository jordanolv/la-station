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
    this.crons.forEach(cron => cron.start());

    // Log de fin uniquement pour le global manager
    if (this.featureName === 'global' && this.crons.length > 0) {
      const chalk = require('chalk');
      console.log(chalk.yellow('   └─') + chalk.green(` ${this.getActiveJobsCount()} job(s) actif(s)`));
    }
  }

  /**
   * Compte le nombre total de jobs actifs
   */
  private getActiveJobsCount(): number {
    let count = 0;
    this.crons.forEach(cron => {
      if ((cron as any).getCrons) {
        count += (cron as any).getCrons().length;
      } else {
        count += 1;
      }
    });
    return count;
  }

  /**
   * Arrête tous les crons gérés par ce gestionnaire
   */
  public stopAll(): void {
    this.crons.forEach(cron => cron.stop());
  }

  /**
   * Récupère la liste des crons
   */
  public getCrons(): IStartStoppable[] {
    return this.crons;
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