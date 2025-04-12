/**
 * Formatte une date selon le format français
 * @param date La date à formater
 * @returns La date formatée (JJ/MM/AAAA)
 */
export function formatDate(date: Date): string { 
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }).format(date);
}

/**
 * Formatte une durée en secondes en un format lisible
 * @param seconds Le nombre de secondes à formater
 * @returns La durée formatée (ex: "2h 30m 15s" ou "45m" ou "30s")
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
}

/**
 * Calcule la date d'il y a X jours
 * @param days Le nombre de jours à soustraire
 * @returns La date calculée
 */
export function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
} 