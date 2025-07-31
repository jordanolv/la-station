import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from '@hono/node-server/serve-static'
import { BotClient } from '../bot/client'
import { auth } from './routes/auth'
import { guilds } from './routes/guilds'
import vocManager from './routes/voc-manager'
// import suggestions from '../features/suggestions/routes/suggestions.route' // Moved to guilds.ts
import party from '../features/party/routes/party.routes'
import chatGaming from '../features/chat-gaming/routes/chat-gaming.routes'

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

  // Serve static files from uploads directory - manual route
  const projectRoot = path.resolve(__dirname, '../..');
  const fs = require('fs');
  
  app.get('/uploads/:filename', async (c) => {
    const filename = c.req.param('filename')
    const filePath = path.join(projectRoot, 'uploads', filename)
    
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        console.log('File not found:', filePath)
        return c.notFound()
      }
      
      // Lire le fichier
      const file = fs.readFileSync(filePath)
      
      // Déterminer le type MIME
      const ext = path.extname(filename).toLowerCase()
      let contentType = 'application/octet-stream'
      
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg'
          break
        case '.png':
          contentType = 'image/png'
          break
        case '.gif':
          contentType = 'image/gif'
          break
        case '.webp':
          contentType = 'image/webp'
          break
      }
      
      
      // Définir les headers CORS manuellement
      c.header('Access-Control-Allow-Origin', '*')
      c.header('Access-Control-Allow-Methods', 'GET')
      c.header('Access-Control-Allow-Headers', 'Content-Type')
      c.header('Content-Type', contentType)
      c.header('Cache-Control', 'public, max-age=3600')
      
      return c.body(file)
      
    } catch (error) {
      console.error('Error serving file:', error)
      return c.text('Internal Server Error', 500)
    }
  })

  // Secure headers après les uploads pour éviter les conflits
  app.use('*', secureHeaders())

  // Routes
  app.route('/api/auth', auth)
  app.route('/api/guilds', guilds)
  app.route('/api/voc-manager', vocManager)
  // app.route('/api/suggestions', suggestions) // Routes moved to guilds.ts
  app.route('/api/party', party)
  app.route('/api/chat-gaming', chatGaming)
  // Health check
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  return app
} 