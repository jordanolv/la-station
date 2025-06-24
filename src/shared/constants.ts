// Configuration générale
export const DEFAULT_PREFIX = '!';
export const DEFAULT_COLOR = '#55CCFC';

// Types de logs
export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Couleurs pour les embeds
export const COLORS = {
  INFO: 0x3498db,    // Bleu
  WARNING: 0xe67e22, // Orange
  ERROR: 0xe74c3c,   // Rouge
  SUCCESS: 0x2ecc71  // Vert
};

// IDs Discord
export const ADMIN_ROLE_ID = '1160997258247032963';

// Chemins de fichiers
export const UPLOADS_DIR = 'uploads';

// Timeouts
export const MESSAGE_DELETE_TIMEOUT = 5000; // 5 secondes 