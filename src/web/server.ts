import express from 'express';
import path from 'path';
import chalk from 'chalk';
import mountainMapRoute from './routes/mountain-map.route';
import adminRoute from './routes/admin.route';
import { BotClient } from '../bot/client';

export function startWebServer(client: BotClient): void {
  const port = parseInt(process.env.WEB_PORT ?? '3001', 10);
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(mountainMapRoute);
  app.use(adminRoute(client));

  // Page globe — sert l'HTML pour toute route /map/*
  app.get('/map', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mountain-map.html'));
  });

  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.listen(port, () => {
    console.log(
      chalk.yellow('   ├─ 🌐 Web server') +
        chalk.gray(` • port ${port} • /admin actif`),
    );
  });
}
