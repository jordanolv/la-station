export interface GameMode {
  id: string;
  label: string;
  slots: number;
}

export interface Game {
  id: string;
  name: string;
  emoji: string;
  color: number;
  banner?: string;
  roleId: string;
  modes: GameMode[] | null;
  typeOptions: { label: string; value: string }[];
  rankOptions: { label: string; value: string }[] | null;
}

export const GAMES: Game[] = [
  {
    id: 'lol',
    name: 'League of Legends',
    emoji: '⚔️',
    color: 0xc79b3b,
    banner: 'https://cdn.discordapp.com/attachments/1360760238348964022/1445473517423431872/banner-lol.png',
    roleId: '1491192552991359006',
    modes: [
      { id: 'duoq', label: 'DuoQ', slots: 2 },
      { id: 'trioq', label: 'TrioQ', slots: 3 },
      { id: 'fivestack', label: 'Five Stack', slots: 5 },
    ],
    typeOptions: [
      { label: 'Casual', value: 'Casual' },
      { label: 'ARAM', value: 'Aram' },
      { label: 'Ranked', value: 'Ranked' },
      { label: 'Privé', value: 'Privé' },
    ],
    rankOptions: [
      { label: 'Fer', value: 'Fer' },
      { label: 'Bronze', value: 'Bronze' },
      { label: 'Argent', value: 'Argent' },
      { label: 'Or', value: 'Or' },
      { label: 'Platine', value: 'Platine' },
      { label: 'Diamant', value: 'Diamant' },
      { label: 'Maître', value: 'Maître' },
      { label: 'Grand Maître', value: 'Grand Maître' },
      { label: 'Challenger', value: 'Challenger' },
    ],
  },
  {
    id: 'rl',
    name: 'Rocket League',
    emoji: '🚗',
    color: 0x088dce,
    banner: 'https://cdn.discordapp.com/attachments/1360760238348964022/1445475071648071751/banner-rl.png',
    roleId: '1491192462092402818',
    modes: [
      { id: '2v2', label: '2v2', slots: 2 },
      { id: '3v3', label: '3v3', slots: 3 },
    ],
    typeOptions: [
      { label: 'Casual', value: 'Casual' },
      { label: 'Ranked', value: 'Ranked' },
      { label: 'Privé', value: 'Privé' },
    ],
    rankOptions: [
      { label: 'Bronze', value: 'Bronze' },
      { label: 'Argent', value: 'Argent' },
      { label: 'Or', value: 'Or' },
      { label: 'Platine', value: 'Platine' },
      { label: 'Diamant', value: 'Diamant' },
      { label: 'Champion', value: 'Champion' },
      { label: 'Grand Champion', value: 'Grand Champion' },
      { label: 'SSL', value: 'SSL' },
    ],
  },
  {
    id: 'valorant',
    name: 'Valorant',
    emoji: '🎯',
    color: 0xff4655,
    roleId: '1491192596024791140',
    modes: [
      { id: 'duoq', label: 'DuoQ', slots: 2 },
      { id: 'trioq', label: 'TrioQ', slots: 3 },
      { id: 'fivestack', label: 'Five Stack', slots: 5 },
    ],
    typeOptions: [
      { label: 'Casual', value: 'Casual' },
      { label: 'Ranked', value: 'Ranked' },
      { label: 'Privé', value: 'Privé' },
    ],
    rankOptions: [
      { label: 'Fer', value: 'Fer' },
      { label: 'Bronze', value: 'Bronze' },
      { label: 'Argent', value: 'Argent' },
      { label: 'Or', value: 'Or' },
      { label: 'Platine', value: 'Platine' },
      { label: 'Diamant', value: 'Diamant' },
      { label: 'Ascendant', value: 'Ascendant' },
      { label: 'Immortel', value: 'Immortel' },
      { label: 'Radiant', value: 'Radiant' },
    ],
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    emoji: '🔫',
    color: 0xf7941d,
    roleId: '1491192896605655160',
    modes: [
      { id: 'duoq', label: 'DuoQ', slots: 2 },
      { id: 'trioq', label: 'TrioQ', slots: 3 },
      { id: 'fivestack', label: 'Five Stack', slots: 5 },
    ],
    typeOptions: [
      { label: 'Casual', value: 'Casual' },
      { label: 'Ranked', value: 'Ranked' },
      { label: 'Privé', value: 'Privé' },
    ],
    rankOptions: [
      { label: 'Argent', value: 'Argent' },
      { label: 'Nova', value: 'Nova' },
      { label: 'AK', value: 'AK' },
      { label: 'Aigle', value: 'Aigle' },
      { label: 'Suprême', value: 'Suprême' },
      { label: 'Global', value: 'Global' },
    ],
  },
  {
    id: 'tft',
    name: 'Teamfight Tactics',
    emoji: '♟️',
    color: 0xa73ce4,
    banner: 'https://cdn.discordapp.com/attachments/1360760238348964022/1445792837328306328/banner-tft.png',
    roleId: '1491193008824127589',
    modes: null,
    typeOptions: [
      { label: 'Casual', value: 'Casual' },
      { label: 'Ranked', value: 'Ranked' },
    ],
    rankOptions: [
      { label: 'Fer', value: 'Fer' },
      { label: 'Bronze', value: 'Bronze' },
      { label: 'Argent', value: 'Argent' },
      { label: 'Or', value: 'Or' },
      { label: 'Platine', value: 'Platine' },
      { label: 'Diamant', value: 'Diamant' },
      { label: 'Maître', value: 'Maître' },
      { label: 'Grand Maître', value: 'Grand Maître' },
      { label: 'Challenger', value: 'Challenger' },
    ],
  },
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

export const NONE = '-';
