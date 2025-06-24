/**
 * Utilitaires pour le formatage des dates et du temps
 */

/**
 * Formate une date au format français (JJ/MM/AAAA)
 * @param date Date à formater
 * @returns Date formatée
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return 'Non défini';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formate un temps en secondes en format lisible (Xh Ym Zs)
 * @param seconds Temps en secondes
 * @returns Temps formaté
 */
export function formatTime(seconds: number): string {
  if (seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
} 