import { serve } from '@hono/node-server';
import { createAPI } from './index';
import { BotClient } from '../bot/client';
import chalk from 'chalk';

export function startApiServer(port: number = 3051) {
  try {
    // Obtenir l'instance du bot client
    const client = BotClient.getInstance();
    
    // Créer l'API
    const api = createAPI(client);
    
    // Démarrer le serveur
    serve({
      fetch: api.fetch,
      port
    }, (info) => {
      console.log(chalk.magentaBright(`🌐 API démarrée sur ${chalk.underline(`http://localhost:${info.port}`)}`));
    });
    
    return api;
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur API:', error);
    throw error;
  }
} 