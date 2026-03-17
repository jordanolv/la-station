export const IMPOSTOR_PREFIX = 'impostor';
export const IMPOSTOR_MIN_PER_TEAM = 2;
export const IMPOSTOR_TTL_SECONDS = 86400; // 24h

export const impostorId = {
  joinA: (sid: string) => `impostor_joinA_${sid}`,
  joinB: (sid: string) => `impostor_joinB_${sid}`,
  start: (sid: string) => `impostor_start_${sid}`,
  endGame: (sid: string) => `impostor_endgame_${sid}`,
  // Validation — captain triggers their team's ephemeral: impostor_valteam_{sid}_{gameNum}_{team}
  validateTeam: (sid: string, gn: number, team: 'A' | 'B') =>
    `impostor_valteam_${sid}_${gn}_${team}`,
  // Validation — toggle one challenge: impostor_tc_{sid}_{gameNum}_{playerId}_{idx}
  toggleChallenge: (sid: string, gn: number, pid: string, idx: number) =>
    `impostor_tc_${sid}_${gn}_${pid}_${idx}`,
  // Validation — navigate within team: impostor_valnav_{sid}_{gameNum}_{team}_{teamPlayerIdx}
  valNav: (sid: string, gn: number, team: 'A' | 'B', teamPlayerIdx: number) =>
    `impostor_valnav_${sid}_${gn}_${team}_${teamPlayerIdx}`,
  // Validation — confirm team: impostor_confirmval_{sid}_{gameNum}_{team}
  confirmVal: (sid: string, gn: number, team: 'A' | 'B') =>
    `impostor_confirmval_${sid}_${gn}_${team}`,
  // Vote menu button (opens ephemeral select)
  voteMenu: (sid: string) => `impostor_votemenu_${sid}`,
  // Vote select menu
  voteSelect: (sid: string) => `impostor_voteselect_${sid}`,
  // Reveal results
  reveal: (sid: string) => `impostor_reveal_${sid}`,
  // Paginated challenges after reveal: impostor_userpage_{sid}_{playerIdx}
  userPage: (sid: string, idx: number) => `impostor_userpage_${sid}_${idx}`,
  // Cancel lobby
  cancel: (sid: string) => `impostor_cancel_${sid}`,
  // My role & challenges (ephemeral button on in-progress message)
  myRole: (sid: string) => `impostor_myrole_${sid}`,
};
