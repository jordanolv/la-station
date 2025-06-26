export const FEATURE_CONFIG = {
  'chat-gaming': {
    name: 'Chat Gaming',
    description: 'Créez des jeux communautaires avec des rôles automatiques',
    icon: '🎮',
    color: 'purple'
  },
  'leveling': {
    name: 'Système de niveaux',
    description: 'Système de niveaux et d\'expérience pour les membres',
    icon: '📈',
    color: 'blue'
  },
  'voice-channels': {
    name: 'Salons vocaux',
    description: 'Gestion automatique des salons vocaux',
    icon: '🔊',
    color: 'green'
  },
  'birthday': {
    name: 'Anniversaires',
    description: 'Notifications d\'anniversaires automatiques',
    icon: '🎂',
    color: 'pink'
  },
  'suggestions': {
    name: 'Système de Suggestions',
    description: 'Système de suggestions avec formulaires et votes',
    icon: '💡',
    color: 'indigo'
  }
} as const

export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  GUILDS: '/api/guilds',
  GAMES: '/api/games'
} as const

export const ROUTES = {
  LOGIN: '/',
  SERVERS: '/servers',
  SERVER_DASHBOARD: (id: string) => `/server/${id}`,
  FEATURE_MANAGEMENT: (serverId: string, featureId: string) => `/server/${serverId}/feature/${featureId}`
} as const