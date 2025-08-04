import { CreateGameDTO, UpdateGameDTO, ValidationResult, ValidationError } from './chatGaming.types';

export class ChatGamingValidator {
  
  static validateCreateGame(data: CreateGameDTO): ValidationResult {
    const errors: string[] = [];

    // Validation du nom
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Le nom du jeu est requis');
    } else if (data.name.trim().length < 2) {
      errors.push('Le nom du jeu doit contenir au moins 2 caractères');
    } else if (data.name.trim().length > 50) {
      errors.push('Le nom du jeu ne peut pas dépasser 50 caractères');
    }

    // Validation du guildId
    if (!data.guildId || typeof data.guildId !== 'string') {
      errors.push('Guild ID est requis');
    }

    // Validation de la description (optionnelle)
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push('La description doit être une chaîne de caractères');
      } else if (data.description.length > 500) {
        errors.push('La description ne peut pas dépasser 500 caractères');
      }
    }

    // Validation de la couleur (optionnelle)
    if (data.color !== undefined) {
      if (typeof data.color !== 'string') {
        errors.push('La couleur doit être une chaîne de caractères');
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        errors.push('La couleur doit être au format hexadécimal (#RRGGBB)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUpdateGame(data: UpdateGameDTO): ValidationResult {
    const errors: string[] = [];

    // Si un champ est fourni, il doit être valide
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Le nom du jeu doit être une chaîne de caractères');
      } else if (data.name.trim().length < 2) {
        errors.push('Le nom du jeu doit contenir au moins 2 caractères');
      } else if (data.name.trim().length > 50) {
        errors.push('Le nom du jeu ne peut pas dépasser 50 caractères');
      }
    }

    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push('La description doit être une chaîne de caractères');
      } else if (data.description.length > 500) {
        errors.push('La description ne peut pas dépasser 500 caractères');
      }
    }

    if (data.color !== undefined) {
      if (typeof data.color !== 'string') {
        errors.push('La couleur doit être une chaîne de caractères');
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        errors.push('La couleur doit être au format hexadécimal (#RRGGBB)');
      }
    }

    // Validation des IDs Discord (optionnels)
    if (data.threadId !== undefined && data.threadId !== null) {
      if (typeof data.threadId !== 'string' || data.threadId.trim().length === 0) {
        errors.push('Thread ID doit être une chaîne de caractères non vide');
      }
    }

    if (data.messageId !== undefined && data.messageId !== null) {
      if (typeof data.messageId !== 'string' || data.messageId.trim().length === 0) {
        errors.push('Message ID doit être une chaîne de caractères non vide');
      }
    }

    if (data.roleId !== undefined && data.roleId !== null) {
      if (typeof data.roleId !== 'string' || data.roleId.trim().length === 0) {
        errors.push('Role ID doit être une chaîne de caractères non vide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static throwIfInvalid(validation: ValidationResult): void {
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }
  }
}