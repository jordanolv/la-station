import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from '@hono/node-server/serve-static'
<<<<<<< Updated upstream
import { BotClient } from '../bot/BotClient'
import { auth } from './routes/auth'
import { games } from './routes/games'
import { guilds } from './routes/guilds'

=======
import { BotClient } from '../bot/BotClient.js'
import { auth } from './routes/auth.js'
import { games } from './routes/games.js'
import { servers } from './routes/servers.js'
>>>>>>> Stashed changes
import path from 'path'
import './types.js' // Importer le fichier de types pour étendre Hono
import { createESMPath } from '../bot/utils/esmPath.js'

const { __dirname, __filename } = createESMPath(import.meta.url); 

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

  // Injecter le client bot dans le contexte Hono
  app.use('*', (c, next) => {
    c.set('botClient', client)
    return next()
  })

  // Serve static files from uploads directory at project root
  const uploadsPath = path.resolve(__dirname, '../../uploads');
  app.use('/uploads/*', serveStatic({ root: path.resolve(__dirname, '../..') }))

  // Routes
  app.route('/api/games', games)
<<<<<<< Updated upstream
  app.route('/api/guilds', guilds)
=======
  app.route('/api/servers', servers)
  app.route('/api/auth', auth)

  console.log(auth.routes[0].handler)

>>>>>>> Stashed changes
  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  return app
} 