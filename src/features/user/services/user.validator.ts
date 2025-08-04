import {
  CreateGlobalUserDTO,
  CreateGuildUserDTO,
  UpdateGuildUserDTO,
  SetBirthdayDTO,
  UpdateBirthdayConfigDTO,
  VoiceSessionDTO,
  MessageStatDTO,
  UserStatsUpdateDTO,
  ValidationResult,
  ValidationError
} from './user.types';

export class UserValidator {
  
  // ===== VALIDATION HELPERS =====
  static createValidationResult(isValid: boolean, errors: string[]): ValidationResult {
    return { isValid, errors };
  }

  static throwIfInvalid(validation: ValidationResult): void {
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }
  }

  // ===== GLOBAL USER VALIDATION =====
  static validateCreateGlobalUser(data: CreateGlobalUserDTO): ValidationResult {
    const errors: string[] = [];

    if (!data.id || data.id.trim().length === 0) {
      errors.push('L\'ID Discord est requis');
    }

    if (data.id && (data.id.length < 17 || data.id.length > 19)) {
      errors.push('L\'ID Discord doit contenir entre 17 et 19 caractères');
    }

    if (!/^\d+$/.test(data.id)) {
      errors.push('L\'ID Discord ne doit contenir que des chiffres');
    }

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Le nom d\'utilisateur est requis');
    }

    if (data.name && data.name.length > 32) {
      errors.push('Le nom d\'utilisateur ne peut pas dépasser 32 caractères');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== GUILD USER VALIDATION =====
  static validateCreateGuildUser(data: CreateGuildUserDTO): ValidationResult {
    const errors: string[] = [];

    // Validate Discord ID
    const discordIdValidation = this.validateDiscordId(data.discordId);
    if (!discordIdValidation.isValid) {
      errors.push(...discordIdValidation.errors);
    }

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Le nom d\'utilisateur est requis');
    }

    if (data.name && data.name.length > 32) {
      errors.push('Le nom d\'utilisateur ne peut pas dépasser 32 caractères');
    }

    // Validate guild ID
    const guildIdValidation = this.validateGuildId(data.guildId);
    if (!guildIdValidation.isValid) {
      errors.push(...guildIdValidation.errors);
    }

    // Validate birthday if provided
    if (data.birthday) {
      const birthdayValidation = this.validateBirthday(data.birthday);
      if (!birthdayValidation.isValid) {
        errors.push(...birthdayValidation.errors);
      }
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUpdateGuildUser(data: UpdateGuildUserDTO): ValidationResult {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Le nom d\'utilisateur ne peut pas être vide');
      }
      if (data.name.length > 32) {
        errors.push('Le nom d\'utilisateur ne peut pas dépasser 32 caractères');
      }
    }

    if (data.birthday !== undefined && data.birthday !== null) {
      const birthdayValidation = this.validateBirthday(data.birthday);
      if (!birthdayValidation.isValid) {
        errors.push(...birthdayValidation.errors);
      }
    }

    if (data.profil) {
      if (data.profil.money !== undefined && data.profil.money < 0) {
        errors.push('L\'argent ne peut pas être négatif');
      }
      if (data.profil.exp !== undefined && data.profil.exp < 0) {
        errors.push('L\'expérience ne peut pas être négative');
      }
      if (data.profil.lvl !== undefined && data.profil.lvl < 1) {
        errors.push('Le niveau doit être au minimum 1');
      }
    }

    if (data.stats) {
      if (data.stats.totalMsg !== undefined && data.stats.totalMsg < 0) {
        errors.push('Le nombre de messages ne peut pas être négatif');
      }
      if (data.stats.voiceTime !== undefined && data.stats.voiceTime < 0) {
        errors.push('Le temps vocal ne peut pas être négatif');
      }
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== BIRTHDAY VALIDATION =====
  static validateSetBirthday(data: SetBirthdayDTO): ValidationResult {
    const errors: string[] = [];

    const discordIdValidation = this.validateDiscordId(data.discordId);
    if (!discordIdValidation.isValid) {
      errors.push(...discordIdValidation.errors);
    }

    const guildIdValidation = this.validateGuildId(data.guildId);
    if (!guildIdValidation.isValid) {
      errors.push(...guildIdValidation.errors);
    }

    const birthdayValidation = this.validateBirthday(data.birthday);
    if (!birthdayValidation.isValid) {
      errors.push(...birthdayValidation.errors);
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateBirthday(birthday: Date): ValidationResult {
    const errors: string[] = [];

    if (!(birthday instanceof Date) || isNaN(birthday.getTime())) {
      errors.push('Date d\'anniversaire invalide');
      return this.createValidationResult(false, errors);
    }

    const now = new Date();
    const minDate = new Date(now.getFullYear() - 150, 0, 1); // 150 ans maximum
    const maxDate = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate()); // 13 ans minimum

    if (birthday < minDate) {
      errors.push('La date d\'anniversaire ne peut pas être antérieure à 150 ans');
    }

    if (birthday > maxDate) {
      errors.push('Vous devez avoir au moins 13 ans');
    }

    if (birthday > now) {
      errors.push('La date d\'anniversaire ne peut pas être dans le futur');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== BIRTHDAY CONFIG VALIDATION =====
  static validateUpdateBirthdayConfig(data: UpdateBirthdayConfigDTO): ValidationResult {
    const errors: string[] = [];

    if (data.channel !== undefined) {
      if (data.channel && (data.channel.length < 17 || data.channel.length > 19)) {
        errors.push('L\'ID du canal doit contenir entre 17 et 19 caractères');
      }
      if (data.channel && !/^\d+$/.test(data.channel)) {
        errors.push('L\'ID du canal ne doit contenir que des chiffres');
      }
    }

    if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
      errors.push('Le statut d\'activation doit être un booléen');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== STATS VALIDATION =====
  static validateVoiceSession(data: VoiceSessionDTO): ValidationResult {
    const errors: string[] = [];

    const discordIdValidation = this.validateDiscordId(data.discordId);
    if (!discordIdValidation.isValid) {
      errors.push(...discordIdValidation.errors);
    }

    const guildIdValidation = this.validateGuildId(data.guildId);
    if (!guildIdValidation.isValid) {
      errors.push(...guildIdValidation.errors);
    }

    if (data.duration < 0) {
      errors.push('La durée ne peut pas être négative');
    }

    if (data.duration > 24 * 60 * 60 * 1000) { // 24 heures max
      errors.push('La durée ne peut pas dépasser 24 heures');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateMessageStat(data: MessageStatDTO): ValidationResult {
    const errors: string[] = [];

    const discordIdValidation = this.validateDiscordId(data.discordId);
    if (!discordIdValidation.isValid) {
      errors.push(...discordIdValidation.errors);
    }

    const guildIdValidation = this.validateGuildId(data.guildId);
    if (!guildIdValidation.isValid) {
      errors.push(...guildIdValidation.errors);
    }

    if (data.messageCount < 0) {
      errors.push('Le nombre de messages ne peut pas être négatif');
    }

    if (data.messageCount > 10000) { // Limite raisonnable
      errors.push('Le nombre de messages ne peut pas dépasser 10 000 par update');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateUserStatsUpdate(data: UserStatsUpdateDTO): ValidationResult {
    const errors: string[] = [];

    const discordIdValidation = this.validateDiscordId(data.discordId);
    if (!discordIdValidation.isValid) {
      errors.push(...discordIdValidation.errors);
    }

    const guildIdValidation = this.validateGuildId(data.guildId);
    if (!guildIdValidation.isValid) {
      errors.push(...guildIdValidation.errors);
    }

    if (data.voiceTime !== undefined && data.voiceTime < 0) {
      errors.push('Le temps vocal ne peut pas être négatif');
    }

    if (data.messageCount !== undefined && data.messageCount < 0) {
      errors.push('Le nombre de messages ne peut pas être négatif');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== COMMON VALIDATIONS =====
  static validateDiscordId(discordId: string): ValidationResult {
    const errors: string[] = [];

    if (!discordId || discordId.trim().length === 0) {
      errors.push('L\'ID Discord est requis');
    }

    if (discordId && (discordId.length < 17 || discordId.length > 19)) {
      errors.push('L\'ID Discord doit contenir entre 17 et 19 caractères');
    }

    if (discordId && !/^\d+$/.test(discordId)) {
      errors.push('L\'ID Discord ne doit contenir que des chiffres');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  static validateGuildId(guildId: string): ValidationResult {
    const errors: string[] = [];

    if (!guildId || guildId.trim().length === 0) {
      errors.push('L\'ID de la guilde est requis');
    }

    if (guildId && (guildId.length < 17 || guildId.length > 19)) {
      errors.push('L\'ID de la guilde doit contenir entre 17 et 19 caractères');
    }

    if (guildId && !/^\d+$/.test(guildId)) {
      errors.push('L\'ID de la guilde ne doit contenir que des chiffres');
    }

    return this.createValidationResult(errors.length === 0, errors);
  }

  // ===== DATE PARSING VALIDATION =====
  static validateAndParseBirthdayString(dateStr: string): { isValid: boolean; date?: Date; errors: string[] } {
    const errors: string[] = [];

    if (!dateStr || dateStr.trim().length === 0) {
      errors.push('La date est requise');
      return { isValid: false, errors };
    }

    // Formats supportés: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
    const match = dateStr.match(dateRegex);

    if (!match) {
      errors.push('Format de date invalide. Utilisez JJ/MM/AAAA');
      return { isValid: false, errors };
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12) {
      errors.push('Le mois doit être entre 1 et 12');
      return { isValid: false, errors };
    }

    if (day < 1 || day > 31) {
      errors.push('Le jour doit être entre 1 et 31');
      return { isValid: false, errors };
    }

    // Créer la date (month - 1 car JavaScript utilise 0-11 pour les mois)
    const date = new Date(year, month - 1, day);

    // Vérifier que la date est valide (ex: 31/02 devient 03/03)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      errors.push('Date invalide (ex: 31 février n\'existe pas)');
      return { isValid: false, errors };
    }

    // Valider la date avec les règles métier
    const birthdayValidation = this.validateBirthday(date);
    if (!birthdayValidation.isValid) {
      errors.push(...birthdayValidation.errors);
      return { isValid: false, errors };
    }

    return { isValid: true, date, errors: [] };
  }
}