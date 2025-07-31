import { CreateEventDTO, UpdateEventDTO, ValidationResult, ValidationError } from './party.types';

export class PartyValidator {
  
  static validateCreateEvent(data: Partial<CreateEventDTO>): ValidationResult {
    const errors: string[] = [];

    // Champs requis
    if (!data.name?.trim()) {
      errors.push('Le nom de l\'événement est requis');
    }

    if (!data.game?.trim()) {
      errors.push('Le jeu est requis');
    }

    if (!data.dateTime) {
      errors.push('La date et l\'heure sont requises');
    } else {
      const eventDate = new Date(data.dateTime);
      if (isNaN(eventDate.getTime())) {
        errors.push('Date invalide');
      } else if (eventDate < new Date()) {
        errors.push('La date de l\'événement ne peut pas être dans le passé');
      }
    }

    if (!data.maxSlots || data.maxSlots < 1 || data.maxSlots > 50) {
      errors.push('Le nombre de places doit être entre 1 et 50');
    }

    if (!data.guildId?.trim()) {
      errors.push('Guild ID requis');
    }

    if (!data.channelId?.trim()) {
      errors.push('Channel ID requis');
    }

    if (!data.createdBy?.trim()) {
      errors.push('Créateur requis');
    }

    // Validation couleur (optionnelle)
    if (data.color && !this.isValidColor(data.color)) {
      errors.push('Format de couleur invalide (utilisez #RRGGBB)');
    }

    // Validation nom (longueur)
    if (data.name && data.name.length > 100) {
      errors.push('Le nom ne peut pas dépasser 100 caractères');
    }

    // Validation description (longueur)
    if (data.description && data.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUpdateEvent(data: UpdateEventDTO): ValidationResult {
    const errors: string[] = [];

    // Validation optionnelle des champs
    if (data.name !== undefined && !data.name.trim()) {
      errors.push('Le nom ne peut pas être vide');
    }

    if (data.game !== undefined && !data.game.trim()) {
      errors.push('Le jeu ne peut pas être vide');
    }

    if (data.dateTime !== undefined) {
      const eventDate = new Date(data.dateTime);
      if (isNaN(eventDate.getTime())) {
        errors.push('Date invalide');
      } else if (eventDate < new Date()) {
        errors.push('La date de l\'événement ne peut pas être dans le passé');
      }
    }

    if (data.maxSlots !== undefined && (data.maxSlots < 1 || data.maxSlots > 50)) {
      errors.push('Le nombre de places doit être entre 1 et 50');
    }

    if (data.color !== undefined && !this.isValidColor(data.color)) {
      errors.push('Format de couleur invalide (utilisez #RRGGBB)');
    }

    if (data.name !== undefined && data.name.length > 100) {
      errors.push('Le nom ne peut pas dépasser 100 caractères');
    }

    if (data.description !== undefined && data.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateParticipants(participants: string[], maxSlots: number): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(participants)) {
      errors.push('Les participants doivent être un tableau');
      return { isValid: false, errors };
    }

    if (participants.length > maxSlots) {
      errors.push(`Trop de participants (max ${maxSlots})`);
    }

    // Vérifier les doublons
    const uniqueParticipants = new Set(participants);
    if (uniqueParticipants.size !== participants.length) {
      errors.push('Participants en double détectés');
    }

    // Vérifier le format des IDs Discord
    for (const participant of participants) {
      if (!this.isValidDiscordId(participant)) {
        errors.push(`ID Discord invalide: ${participant}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRewards(rewardAmount?: number, xpAmount?: number): ValidationResult {
    const errors: string[] = [];

    if (rewardAmount !== undefined) {
      if (typeof rewardAmount !== 'number' || rewardAmount < 0) {
        errors.push('Le montant de récompense doit être un nombre positif');
      }
    }

    if (xpAmount !== undefined) {
      if (typeof xpAmount !== 'number' || xpAmount < 0) {
        errors.push('Le montant d\'XP doit être un nombre positif');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static isValidColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  private static isValidDiscordId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  static throwIfInvalid(validation: ValidationResult): void {
    if (!validation.isValid) {
      throw new ValidationError('Données invalides', validation.errors);
    }
  }
}