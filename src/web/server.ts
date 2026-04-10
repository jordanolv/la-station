import express from 'express';
import path from 'path';
import chalk from 'chalk';
import mountainMapRoute from './routes/mountain-map.route';

export function startWebServer(): void {
  const port = parseInt(process.env.WEB_PORT ?? '3001', 10);
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(mountainMapRoute);

  // Page globe — sert l'HTML pour toute route /map/*
  app.get('/map', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mountain-map.html'));
  });

  app.listen(port, () => {
    console.log(
      chalk.yellow('   ├─ 🌐 Web server') +
        chalk.gray(` • port ${port}`),
    );
  });
}
