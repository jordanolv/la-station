import {
  CreateFormDTO,
  CreateFormFieldDTO,
  UpdateFormDTO,
  UpdateFormFieldDTO,
  CreateChannelDTO,
  UpdateChannelDTO,
  CreateSuggestionDTO,
  UpdateSuggestionStatusDTO,
  ValidationResult,
  ValidationError
} from './suggestions.types';

export class SuggestionsValidator {
  
  // ===== VALIDATION HELPERS =====
  static throwIfInvalid(validation: ValidationResult): void {
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }
  }

  static createValidationResult(isValid: boolean, errors: string[] = []): ValidationResult {
    return { isValid, errors };
  }

  // ===== FORM VALIDATION =====
  static validateCreateForm(data: CreateFormDTO): ValidationResult {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Le nom du formulaire est requis');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Le nom du formulaire ne peut pas dépasser 100 caractères');
    }

    if (data.description && data.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
      errors.push('Au moins un champ est requis');
    }

    if (data.fields && data.fields.length > 5) {
      errors.push('Maximum 5 champs par formulaire (limitation Discord)');
    }

    if (data.fields) {
      data.fields.forEach((field, index) => {
        const fieldValidation = this.validateFormField(field);
        if (!fieldValidation.isValid) {
          errors.push(`Champ ${index + 1}: ${fieldValidation.errors.join(', ')}`);
        }
      });
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUpdateForm(data: UpdateFormDTO): ValidationResult {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Le nom du formulaire ne peut pas être vide');
      }
      if (data.name.length > 100) {
        errors.push('Le nom du formulaire ne peut pas dépasser 100 caractères');
      }
    }

    if (data.description !== undefined && data.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    if (data.fields !== undefined) {
      if (!Array.isArray(data.fields) || data.fields.length === 0) {
        errors.push('Au moins un champ est requis');
      }

      if (data.fields.length > 5) {
        errors.push('Maximum 5 champs par formulaire (limitation Discord)');
      }

      data.fields.forEach((field, index) => {
        const fieldValidation = this.validateFormField(field);
        if (!fieldValidation.isValid) {
          errors.push(`Champ ${index + 1}: ${fieldValidation.errors.join(', ')}`);
        }
      });
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateFormField(field: CreateFormFieldDTO | UpdateFormFieldDTO): ValidationResult {
    const errors: string[] = [];

    if (!field.label || field.label.trim().length === 0) {
      errors.push('Le libellé du champ est requis');
    }

    if (field.label && field.label.length > 45) {
      errors.push('Le libellé ne peut pas dépasser 45 caractères (limitation Discord)');
    }

    if (!field.type || !['text', 'textarea'].includes(field.type)) {
      errors.push('Le type de champ doit être "text" ou "textarea"');
    }

    if (field.placeholder && field.placeholder.length > 100) {
      errors.push('Le placeholder ne peut pas dépasser 100 caractères');
    }

    if (field.minLength !== undefined && field.minLength < 0) {
      errors.push('La longueur minimale ne peut pas être négative');
    }

    if (field.maxLength !== undefined) {
      const maxAllowed = field.type === 'textarea' ? 4000 : 1000;
      if (field.maxLength > maxAllowed) {
        errors.push(`La longueur maximale ne peut pas dépasser ${maxAllowed} caractères pour ce type de champ`);
      }
    }

    if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
      errors.push('La longueur minimale ne peut pas être supérieure à la longueur maximale');
    }

    if (field.defaultValue && field.maxLength && field.defaultValue.length > field.maxLength) {
      errors.push('La valeur par défaut dépasse la longueur maximale autorisée');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== CHANNEL VALIDATION =====
  static validateCreateChannel(data: CreateChannelDTO): ValidationResult {
    const errors: string[] = [];

    if (!data.channelId || data.channelId.trim().length === 0) {
      errors.push('L\'ID du channel est requis');
    }

    if (!data.formId || data.formId.trim().length === 0) {
      errors.push('L\'ID du formulaire est requis');
    }

    if (data.republishInterval !== undefined && (data.republishInterval < 1 || data.republishInterval > 100)) {
      errors.push('L\'intervalle de republication doit être entre 1 et 100');
    }

    if (data.customReactions && data.customReactions.length > 20) {
      errors.push('Maximum 20 réactions personnalisées');
    }

    if (data.customReactions) {
      data.customReactions.forEach((reaction, index) => {
        if (!reaction || reaction.trim().length === 0) {
          errors.push(`Réaction ${index + 1}: Une réaction ne peut pas être vide`);
        }
      });
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUpdateChannel(data: UpdateChannelDTO): ValidationResult {
    const errors: string[] = [];

    if (data.formId !== undefined && (!data.formId || data.formId.trim().length === 0)) {
      errors.push('L\'ID du formulaire ne peut pas être vide');
    }

    if (data.republishInterval !== undefined && (data.republishInterval < 1 || data.republishInterval > 100)) {
      errors.push('L\'intervalle de republication doit être entre 1 et 100');
    }

    if (data.customReactions !== undefined) {
      if (data.customReactions.length > 20) {
        errors.push('Maximum 20 réactions personnalisées');
      }

      data.customReactions.forEach((reaction, index) => {
        if (!reaction || reaction.trim().length === 0) {
          errors.push(`Réaction ${index + 1}: Une réaction ne peut pas être vide`);
        }
      });
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== SUGGESTION VALIDATION =====
  static validateCreateSuggestion(data: CreateSuggestionDTO): ValidationResult {
    const errors: string[] = [];

    if (!data.guildId || data.guildId.trim().length === 0) {
      errors.push('L\'ID de la guilde est requis');
    }

    if (!data.channelId || data.channelId.trim().length === 0) {
      errors.push('L\'ID du channel est requis');
    }

    if (!data.formId || data.formId.trim().length === 0) {
      errors.push('L\'ID du formulaire est requis');
    }

    if (!data.authorId || data.authorId.trim().length === 0) {
      errors.push('L\'ID de l\'auteur est requis');
    }

    if (!data.authorUsername || data.authorUsername.trim().length === 0) {
      errors.push('Le nom d\'utilisateur de l\'auteur est requis');
    }

    if (!data.fields || !Array.isArray(data.fields) || data.fields.length === 0) {
      errors.push('Au moins un champ est requis');
    }

    if (data.fields) {
      data.fields.forEach((field, index) => {
        const fieldValidation = this.validateSuggestionField(field);
        if (!fieldValidation.isValid) {
          errors.push(`Champ ${index + 1}: ${fieldValidation.errors.join(', ')}`);
        }
      });
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateSuggestionField(field: {fieldId: string, label: string, value: string, type: 'text' | 'textarea'}): ValidationResult {
    const errors: string[] = [];

    if (!field.fieldId || field.fieldId.trim().length === 0) {
      errors.push('L\'ID du champ est requis');
    }

    if (!field.label || field.label.trim().length === 0) {
      errors.push('Le libellé du champ est requis');
    }

    if (!field.value || field.value.trim().length === 0) {
      errors.push('La valeur du champ est requise');
    }

    if (!field.type || !['text', 'textarea'].includes(field.type)) {
      errors.push('Le type de champ doit être "text" ou "textarea"');
    }

    if (field.value && field.value.length > 4000) {
      errors.push('La valeur du champ ne peut pas dépasser 4000 caractères');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUpdateSuggestionStatus(data: UpdateSuggestionStatusDTO): ValidationResult {
    const errors: string[] = [];

    if (!data.status || data.status.trim().length === 0) {
      errors.push('Le statut est requis');
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'implemented', 'under_review'];
    if (data.status && !validStatuses.includes(data.status)) {
      errors.push(`Le statut doit être l'un des suivants: ${validStatuses.join(', ')}`);
    }

    if (data.note && data.note.length > 1000) {
      errors.push('La note de modération ne peut pas dépasser 1000 caractères');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== DISCORD VALIDATION =====
  static validateChannelId(channelId: string): ValidationResult {
    const errors: string[] = [];

    if (!channelId || channelId.trim().length === 0) {
      errors.push('L\'ID du channel est requis');
    }

    // Discord snowflake validation (basic)
    if (channelId && !/^\d{17,19}$/.test(channelId)) {
      errors.push('L\'ID du channel n\'est pas au format Discord valide');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || userId.trim().length === 0) {
      errors.push('L\'ID de l\'utilisateur est requis');
    }

    // Discord snowflake validation (basic)
    if (userId && !/^\d{17,19}$/.test(userId)) {
      errors.push('L\'ID de l\'utilisateur n\'est pas au format Discord valide');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateGuildId(guildId: string): ValidationResult {
    const errors: string[] = [];

    if (!guildId || guildId.trim().length === 0) {
      errors.push('L\'ID de la guilde est requis');
    }

    // Discord snowflake validation (basic)
    if (guildId && !/^\d{17,19}$/.test(guildId)) {
      errors.push('L\'ID de la guilde n\'est pas au format Discord valide');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }
}