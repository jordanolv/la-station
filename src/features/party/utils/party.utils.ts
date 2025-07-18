export class PartyUtils {

  static validateEventData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation de la structure eventInfo
    if (!data.eventInfo) {
      errors.push('Les informations de l\'événement sont requises');
      return { isValid: false, errors };
    }

    // Validation du nom
    if (!data.eventInfo.name || data.eventInfo.name.trim().length === 0) {
      errors.push('Le nom de l\'événement est requis');
    } else if (data.eventInfo.name.length > 100) {
      errors.push('Le nom de l\'événement ne peut pas dépasser 100 caractères');
    }

    // Validation du jeu
    if (!data.eventInfo.game || data.eventInfo.game.trim().length === 0) {
      errors.push('Le jeu est requis');
    } else if (data.eventInfo.game.length > 100) {
      errors.push('Le nom du jeu ne peut pas dépasser 100 caractères');
    }

    // Validation de la description
    if (data.eventInfo.description && data.eventInfo.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    // Validation de la date et heure combinées
    if (!data.eventInfo.dateTime) {
      errors.push('La date et l\'heure sont requises');
    } else {
      const eventDate = new Date(data.eventInfo.dateTime);
      const now = new Date();
      if (eventDate < now) {
        errors.push('La date de l\'événement ne peut pas être dans le passé');
      }
    }

    // Validation du nombre de places
    if (!data.eventInfo.maxSlots || isNaN(data.eventInfo.maxSlots) || data.eventInfo.maxSlots < 1 || data.eventInfo.maxSlots > 50) {
      errors.push('Le nombre de places doit être entre 1 et 50');
    }

    // Validation de la couleur
    if (data.eventInfo.color && !/^#[0-9A-F]{6}$/i.test(data.eventInfo.color)) {
      errors.push('La couleur doit être au format hexadécimal (ex: #FF6B6B)');
    }

    // Validation de la structure discord
    if (!data.discord) {
      errors.push('Les informations Discord sont requises');
      return { isValid: false, errors };
    }

    // Validation du channel
    if (!data.discord.channelId) {
      errors.push('Le channel est requis');
    }

    // Validation du guild
    if (!data.discord.guildId) {
      errors.push('L\'ID du serveur est requis');
    }

    // Validation du créateur
    if (!data.createdBy) {
      errors.push('L\'ID du créateur est requis');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

}