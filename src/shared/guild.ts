/**
 * Retourne le GUILD_ID du serveur unique défini dans .env.
 * Lève une erreur au démarrage si la variable est absente.
 */
export function getGuildId(): string {
  const id = process.env.GUILD_ID;
  if (!id) throw new Error('GUILD_ID manquant dans .env');
  return id;
}
