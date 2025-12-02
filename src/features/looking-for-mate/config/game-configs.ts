export interface GameConfig {
  maxPlayers?: number;
  rankPlaceholder?: string;
  rankSuggestions?: string;
  descriptionPlaceholder?: string;
  matesLabel?: string;
  ranks?: string[]; 
}

export const GAME_CONFIGS: Record<string, GameConfig> = {
  'League of Legends': {
    maxPlayers: 4,
    rankPlaceholder: 'Ex: Iron, Bronze, Silver, Gold, Platine, Diamant, Master...',
    rankSuggestions: 'Indiquez votre rank LoL',
    descriptionPlaceholder: 'Ex: Cherche des joueurs chill pour ranked, micro requis, on vise Diamant...',
    matesLabel: 'Nombre de coéquipiers (max 4)',
    ranks: ['Tous niveaux', 'Casual', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platine', 'Émeraude', 'Diamant', 'Master+'],
  },
  'Valorant': {
    maxPlayers: 4,
    rankPlaceholder: 'Ex: Fer, Bronze, Argent, Or, Platine, Diamant, Immortel...',
    rankSuggestions: 'Indiquez votre rank Valorant',
    descriptionPlaceholder: 'Ex: Team ranked sérieuse, micro obligatoire, agents flex...',
    matesLabel: 'Nombre de coéquipiers (max 4)',
    ranks: ['Tous niveaux', 'Casual', 'Fer', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Ascendant', 'Immortel+'],
  },
  'Counter-Strike 2': {
    maxPlayers: 4,
    rankPlaceholder: 'Ex: Argent, Or Nova, MG, Aigle, Suprême, Global...',
    rankSuggestions: 'Indiquez votre rank CS2',
    descriptionPlaceholder: 'Ex: Cherche team compétitive, strats requis, micro obligatoire...',
    matesLabel: 'Nombre de coéquipiers (max 4)',
  },
  'Overwatch 2': {
    maxPlayers: 5,
    rankPlaceholder: 'Ex: Bronze, Argent, Or, Platine, Diamant, Master, Grand Master...',
    rankSuggestions: 'Indiquez votre rank et rôle principal',
    descriptionPlaceholder: 'Ex: Main Tank cherche DPS/Heal pour ranked, niveau Platine+...',
    matesLabel: 'Nombre de coéquipiers (max 5)',
  },
  'Apex Legends': {
    maxPlayers: 2,
    rankPlaceholder: 'Ex: Bronze, Argent, Or, Platine, Diamant, Master, Predator...',
    rankSuggestions: 'Indiquez votre rank Apex',
    descriptionPlaceholder: 'Ex: Cherche duo/trio pour ranked, push Diamant, micro requis...',
    matesLabel: 'Nombre de coéquipiers (max 2)',
  },
  'Fortnite': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Débutant, Intermédiaire, Avancé, Champion...',
    rankSuggestions: 'Indiquez votre niveau',
    descriptionPlaceholder: 'Ex: Cherche squad pour arène/ranked, bon niveau de build...',
    matesLabel: 'Nombre de coéquipiers (max 3)',
  },
  'Dota 2': {
    maxPlayers: 4,
    rankPlaceholder: 'Ex: Herald, Guardian, Crusader, Archon, Legend, Ancient, Divine...',
    rankSuggestions: 'Indiquez votre MMR/rank',
    descriptionPlaceholder: 'Ex: Cherche stack ranked, rôles flex, niveau Legend+...',
    matesLabel: 'Nombre de coéquipiers (max 4)',
  },
  'Rocket League': {
    maxPlayers: 2,
    rankPlaceholder: 'Ex: Bronze, Argent, Or, Platine, Diamant, Champion, Grand Champion...',
    rankSuggestions: 'Indiquez votre rank',
    descriptionPlaceholder: 'Ex: Cherche coéquipier pour 2v2/3v3 ranked, niveau Diamant...',
    matesLabel: 'Nombre de coéquipiers (max 2)',
    ranks: ['All', 'Casual', 'Bronze', 'Silver', 'Gold', 'Plat', 'Diamond', 'Champ', 'GC', 'SSL'],
  },
  'Rainbow Six Siege': {
    maxPlayers: 4,
    rankPlaceholder: 'Ex: Cuivre, Bronze, Argent, Or, Platine, Diamant, Champion...',
    rankSuggestions: 'Indiquez votre rank R6',
    descriptionPlaceholder: 'Ex: Cherche stack ranked sérieux, callouts FR, niveau Or+...',
    matesLabel: 'Nombre de coéquipiers (max 4)',
  },
  'Minecraft': {
    maxPlayers: 10,
    rankPlaceholder: 'Ex: Débutant, Intermédiaire, Expert, Redstone...',
    rankSuggestions: 'Indiquez votre niveau/spécialité',
    descriptionPlaceholder: 'Ex: Cherche joueurs pour serveur survie, construction, farm...',
    matesLabel: 'Nombre de joueurs recherchés',
    ranks: ['All', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
  },
  'Teamfight Tactics': {
    maxPlayers: 7,
    rankPlaceholder: 'Ex: Iron, Bronze, Silver, Gold, Platine, Diamant, Master...',
    rankSuggestions: 'Indiquez votre rank TFT',
    descriptionPlaceholder: 'Ex: Cherche joueurs pour double-up, niveau Gold+, strat flex...',
    matesLabel: 'Nombre de coéquipiers (max 7)',
    ranks: ['All', 'Casual', 'Iron', 'Bronze', 'Silver', 'Gold', 'Plat', 'Diamond', 'Master+'],
  },
  'Among Us': {
    maxPlayers: 9,
    rankPlaceholder: 'Ex: Casual, Expérimenté...',
    rankSuggestions: 'Indiquez votre niveau',
    descriptionPlaceholder: 'Ex: Cherche joueurs pour partie chill, vocal Discord...',
    matesLabel: 'Nombre de joueurs (max 9)',
  },
  'Dead by Daylight': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Cendres, Bronze, Argent, Or, Iridescent...',
    rankSuggestions: 'Indiquez votre grade',
    descriptionPlaceholder: 'Ex: Cherche SWF pour survie, niveau Gold+, micro souhaité...',
    matesLabel: 'Nombre de survivants (max 3)',
  },
  'Phasmophobia': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Débutant, Intermédiaire, Expert...',
    rankSuggestions: 'Indiquez votre niveau',
    descriptionPlaceholder: 'Ex: Cherche équipe pour Professional/Nightmare, expérience requise...',
    matesLabel: 'Nombre de coéquipiers (max 3)',
  },
  'Sea of Thieves': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Débutant, Pirate légende, Athena...',
    rankSuggestions: 'Indiquez votre niveau',
    descriptionPlaceholder: 'Ex: Cherche crew pour Athena/Fort, micro requis, chill...',
    matesLabel: 'Nombre de pirates (max 3)',
  },
  'Back 4 Blood': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Recrue, Vétéran, Cauchemar, No Hope...',
    rankSuggestions: 'Indiquez la difficulté souhaitée',
    descriptionPlaceholder: 'Ex: Cherche équipe pour Cauchemar, builds optimisés...',
    matesLabel: 'Nombre de nettoyeurs (max 3)',
  },
  'Lethal Company': {
    maxPlayers: 3,
    rankPlaceholder: 'Ex: Débutant, Confirmé...',
    rankSuggestions: 'Indiquez votre niveau',
    descriptionPlaceholder: 'Ex: Cherche équipe pour farm quota, connaissance des monstres...',
    matesLabel: 'Nombre d\'employés (max 3)',
  },
};

/**
 * Default ranks for games without specific configuration
 */
const DEFAULT_RANKS = ['Tous niveaux', 'Casual', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];

/**
 * Get game configuration or return default
 */
export function getGameConfig(gameName: string): GameConfig {
  return GAME_CONFIGS[gameName] || {
    maxPlayers: 10,
    rankPlaceholder: 'Ex: Débutant, Intermédiaire, Expert...',
    rankSuggestions: 'Indiquez votre rank/niveau',
    descriptionPlaceholder: 'Ex: Cherche des joueurs pour jouer ensemble...',
    matesLabel: 'Nombre de coéquipiers recherchés',
    ranks: DEFAULT_RANKS,
  };
}
