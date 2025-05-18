import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from '@hono/node-server/serve-static'
import { BotClient } from '../bot/BotClient'
import { auth } from './routes/auth'
import { games } from './routes/games'
import { guilds } from './routes/guilds'

import path from 'path'

export function createAPI(client: BotClient) {
  const app = new Hono()

  // Middleware
  app.use('*', logger())
  app.use('*', cors())
  app.use('*', secureHeaders())

  // Serve static files from uploads directory at project root
  const uploadsPath = path.resolve(__dirname, '../../uploads');
  app.use('/uploads/*', serveStatic({ root: path.resolve(__dirname, '../..') }))

  // Routes
  app.route('/api/auth', auth)
  app.route('/api/games', games)
  app.route('/api/guilds', guilds)
  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  return app
} 