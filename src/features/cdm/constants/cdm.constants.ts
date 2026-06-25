export const CDM_EVENT_KEY = 'cdm-2026';

export const CDM_TITLE = 'Coupe du Monde 2026';

/** Récompenses fixes attribuées par bon pronostic. Éditable librement. */
export const CDM_REWARD = {
  team: { money: 1500, expeditions: 10 },
  outsider: { money: 1500, expeditions: 10 },
} as const;

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

export interface CdmTeam {
  name: string;
  flag: string;
  conf: Confederation;
}

export const CONFEDERATIONS: { id: Confederation; label: string; emoji: string }[] = [
  { id: 'UEFA', label: 'Europe', emoji: '🇪🇺' },
  { id: 'CONMEBOL', label: 'Amérique du Sud', emoji: '🌎' },
  { id: 'CAF', label: 'Afrique', emoji: '🌍' },
  { id: 'AFC', label: 'Asie', emoji: '🌏' },
  { id: 'CONCACAF', label: 'Amérique du Nord', emoji: '🏟️' },
  { id: 'OFC', label: 'Océanie', emoji: '🏝️' },
];

/** Les 48 qualifiés officiels de la CDM 2026. */
export const CDM_TEAMS: CdmTeam[] = [
  // UEFA (16)
  { name: 'France', flag: '🇫🇷', conf: 'UEFA' },
  { name: 'Espagne', flag: '🇪🇸', conf: 'UEFA' },
  { name: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA' },
  { name: 'Allemagne', flag: '🇩🇪', conf: 'UEFA' },
  { name: 'Portugal', flag: '🇵🇹', conf: 'UEFA' },
  { name: 'Pays-Bas', flag: '🇳🇱', conf: 'UEFA' },
  { name: 'Belgique', flag: '🇧🇪', conf: 'UEFA' },
  { name: 'Croatie', flag: '🇭🇷', conf: 'UEFA' },
  { name: 'Suisse', flag: '🇨🇭', conf: 'UEFA' },
  { name: 'Autriche', flag: '🇦🇹', conf: 'UEFA' },
  { name: 'Turquie', flag: '🇹🇷', conf: 'UEFA' },
  { name: 'Norvège', flag: '🇳🇴', conf: 'UEFA' },
  { name: 'Suède', flag: '🇸🇪', conf: 'UEFA' },
  { name: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf: 'UEFA' },
  { name: 'Tchéquie', flag: '🇨🇿', conf: 'UEFA' },
  { name: 'Bosnie', flag: '🇧🇦', conf: 'UEFA' },
  // CONMEBOL (6)
  { name: 'Argentine', flag: '🇦🇷', conf: 'CONMEBOL' },
  { name: 'Brésil', flag: '🇧🇷', conf: 'CONMEBOL' },
  { name: 'Uruguay', flag: '🇺🇾', conf: 'CONMEBOL' },
  { name: 'Colombie', flag: '🇨🇴', conf: 'CONMEBOL' },
  { name: 'Équateur', flag: '🇪🇨', conf: 'CONMEBOL' },
  { name: 'Paraguay', flag: '🇵🇾', conf: 'CONMEBOL' },
  // CAF (10)
  { name: 'Maroc', flag: '🇲🇦', conf: 'CAF' },
  { name: 'Sénégal', flag: '🇸🇳', conf: 'CAF' },
  { name: "Côte d'Ivoire", flag: '🇨🇮', conf: 'CAF' },
  { name: 'Égypte', flag: '🇪🇬', conf: 'CAF' },
  { name: 'Algérie', flag: '🇩🇿', conf: 'CAF' },
  { name: 'Ghana', flag: '🇬🇭', conf: 'CAF' },
  { name: 'Tunisie', flag: '🇹🇳', conf: 'CAF' },
  { name: 'Afrique du Sud', flag: '🇿🇦', conf: 'CAF' },
  { name: 'Cap-Vert', flag: '🇨🇻', conf: 'CAF' },
  { name: 'RD Congo', flag: '🇨🇩', conf: 'CAF' },
  // AFC (9)
  { name: 'Japon', flag: '🇯🇵', conf: 'AFC' },
  { name: 'Corée du Sud', flag: '🇰🇷', conf: 'AFC' },
  { name: 'Iran', flag: '🇮🇷', conf: 'AFC' },
  { name: 'Australie', flag: '🇦🇺', conf: 'AFC' },
  { name: 'Arabie Saoudite', flag: '🇸🇦', conf: 'AFC' },
  { name: 'Qatar', flag: '🇶🇦', conf: 'AFC' },
  { name: 'Ouzbékistan', flag: '🇺🇿', conf: 'AFC' },
  { name: 'Jordanie', flag: '🇯🇴', conf: 'AFC' },
  { name: 'Irak', flag: '🇮🇶', conf: 'AFC' },
  // CONCACAF (6)
  { name: 'Canada', flag: '🇨🇦', conf: 'CONCACAF' },
  { name: 'Mexique', flag: '🇲🇽', conf: 'CONCACAF' },
  { name: 'États-Unis', flag: '🇺🇸', conf: 'CONCACAF' },
  { name: 'Panama', flag: '🇵🇦', conf: 'CONCACAF' },
  { name: 'Curaçao', flag: '🇨🇼', conf: 'CONCACAF' },
  { name: 'Haïti', flag: '🇭🇹', conf: 'CONCACAF' },
  // OFC (1)
  { name: 'Nouvelle-Zélande', flag: '🇳🇿', conf: 'OFC' },
];

/** Grosses équipes (favorites) — exclues du menu « outsider ». */
export const BIG_TEAMS: string[] = [
  'France',
  'Argentine',
  'Brésil',
  'Angleterre',
  'Espagne',
  'Allemagne',
  'Portugal',
  'Pays-Bas',
  'Belgique',
];

export function isBigTeam(name: string): boolean {
  return BIG_TEAMS.includes(name);
}

export function teamsByConf(conf: Confederation, opts: { excludeBig?: boolean } = {}): CdmTeam[] {
  return CDM_TEAMS.filter(t => t.conf === conf && (!opts.excludeBig || !isBigTeam(t.name)));
}

export function findTeam(name?: string): CdmTeam | undefined {
  if (!name) return undefined;
  return CDM_TEAMS.find(t => t.name === name);
}

export function teamLabel(name?: string): string {
  if (!name) return '*non défini*';
  const team = findTeam(name);
  return team ? `${team.flag} ${team.name}` : name;
}
