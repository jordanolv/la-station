import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from '@hono/node-server/serve-static'
import { BotClient } from '../bot/client'
import { auth } from './routes/auth'
import { games } from './routes/games'
import { guilds } from './routes/guilds'
import vocManager from './routes/voc-manager'
// import suggestions from '../features/suggestions/routes/suggestions.route' // Moved to guilds.ts
import party from '../features/party/routes/party.route'

import path from 'path'

export function createAPI(client: BotClient) {
  const app = new Hono()

  // Middleware
  app.use('*', logger())
  
  // Configuration CORS plus permissive
  app.use('*', cors({
    origin: '*', // Autorise toutes les origines
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'Content-Type'],
    credentials: true,
    maxAge: 86400 // 24 heures
  }))
  
  app.use('*', secureHeaders())

  // Serve static files from uploads directory
  const projectRoot = path.resolve(__dirname, '../../..');
  const srcPath = path.resolve(__dirname, '..');
  console.log('__dirname:', __dirname);
  console.log('Project root:', projectRoot);
  console.log('Src path:', srcPath);
  console.log('Uploads path expected:', path.join(srcPath, 'uploads'));
  
  app.use('/uploads/*', serveStatic({
    root: srcPath
  }) as any)

  // Routes
  app.route('/api/auth', auth)
  app.route('/api/games', games)
  app.route('/api/guilds', guilds)
  app.route('/api/voc-manager', vocManager)
  // app.route('/api/suggestions', suggestions) // Routes moved to guilds.ts
  app.route('/api/party', party)
  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  return app
} 