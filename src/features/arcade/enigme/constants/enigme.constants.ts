export const ENIGME_SPAWN_HOUR = 12;
export const ENIGME_HINT_HOUR = 15;
export const ENIGME_REVEAL_HOUR = 21;

export const ENIGME_MAX_ATTEMPTS = 3;

/** 🥇 🥈 🥉 — ordre d'arrivée des bonnes réponses */
export const ENIGME_PODIUM_REWARDS = [
  { money: 500, xp: 300, expeditions: 2 },
  { money: 300, xp: 200, expeditions: 1 },
  { money: 150, xp: 100, expeditions: 1 },
];

/** Bonne réponse hors podium */
export const ENIGME_SOLVER_FRAGMENTS = 10;
/** A tenté sans trouver */
export const ENIGME_PARTICIPATION_FRAGMENTS = 3;

export const ENIGME_BUTTON_ID = 'enigme:answer';
export const ENIGME_MODAL_ID = 'enigme:modal';

export const ENIGME_ACCENT_COLOR = 0xb388eb;
export const ENIGME_FINISHED_ACCENT_COLOR = 0x57cc99;
