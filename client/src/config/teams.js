// ═══════════════════════════════════════════════════════════
// config/teams.js — IPL 2026 team and venue data
// ═══════════════════════════════════════════════════════════

export const TEAMS = {
  MI: {
    name:  'Mumbai Indians',
    color: '#004BA0',
    short: 'MI',
  },
  CSK: {
    name:  'Chennai Super Kings',
    color: '#F5A623',
    short: 'CSK',
  },
  RCB: {
    name:  'Royal Challengers Bengaluru',
    color: '#CC0000',
    short: 'RCB',
  },
  KKR: {
    name:  'Kolkata Knight Riders',
    color: '#3A225D',
    short: 'KKR',
  },
  SRH: {
    name:  'Sunrisers Hyderabad',
    color: '#FF822A',
    short: 'SRH',
  },
  DC: {
    name:  'Delhi Capitals',
    color: '#0078BC',
    short: 'DC',
  },
  PBKS: {
    name:  'Punjab Kings',
    color: '#ED1B24',
    short: 'PBKS',
  },
  RR: {
    name:  'Rajasthan Royals',
    color: '#EA1A85',
    short: 'RR',
  },
  GT: {
    name:  'Gujarat Titans',
    color: '#1C3B6E',
    short: 'GT',
  },
  LSG: {
    name:  'Lucknow Super Giants',
    color: '#A4C639',
    short: 'LSG',
  },
};

export const VENUES = {
  'Wankhede Stadium': {
    city:            'Mumbai',
    avgFirstInnings: 178,
    chasingWinPct:   52,
    avgPowerplay:    54,
  },
  'M. A. Chidambaram Stadium': {
    city:            'Chennai',
    avgFirstInnings: 168,
    chasingWinPct:   44,
    avgPowerplay:    50,
  },
  'M. Chinnaswamy Stadium': {
    city:            'Bengaluru',
    avgFirstInnings: 183,
    chasingWinPct:   55,
    avgPowerplay:    57,
  },
  'Eden Gardens': {
    city:            'Kolkata',
    avgFirstInnings: 172,
    chasingWinPct:   48,
    avgPowerplay:    52,
  },
  'Rajiv Gandhi Intl. Stadium': {
    city:            'Hyderabad',
    avgFirstInnings: 175,
    chasingWinPct:   50,
    avgPowerplay:    53,
  },
  'Arun Jaitley Stadium': {
    city:            'Delhi',
    avgFirstInnings: 170,
    chasingWinPct:   47,
    avgPowerplay:    51,
  },
  'Narendra Modi Stadium': {
    city:            'Ahmedabad',
    avgFirstInnings: 176,
    chasingWinPct:   49,
    avgPowerplay:    53,
  },
  'Sawai Mansingh Stadium': {
    city:            'Jaipur',
    avgFirstInnings: 169,
    chasingWinPct:   46,
    avgPowerplay:    51,
  },
  'Ekana Cricket Stadium': {
    city:            'Lucknow',
    avgFirstInnings: 167,
    chasingWinPct:   45,
    avgPowerplay:    50,
  },
  'Punjab Cricket Association Stadium': {
    city:            'Mohali',
    avgFirstInnings: 171,
    chasingWinPct:   48,
    avgPowerplay:    52,
  },
};

/**
 * Get team info by abbreviation or partial name match.
 * @param {string} search — e.g. "MI", "Mumbai Indians"
 * @returns {Object|null}
 */
export function getTeam(search) {
  if (!search) return null;
  const upper = search.toUpperCase();

  // Exact abbreviation match
  if (TEAMS[upper]) return { ...TEAMS[upper], abbr: upper };

  // Partial name match
  const entry = Object.entries(TEAMS).find(([, t]) =>
    t.name.toUpperCase().includes(upper)
  );
  return entry ? { ...entry[1], abbr: entry[0] } : null;
}

/**
 * Get venue data by ground name (partial match).
 * @param {string} venueName
 * @returns {Object|null}
 */
export function getVenue(venueName) {
  if (!venueName) return null;
  const upper = venueName.toUpperCase();
  const entry = Object.entries(VENUES).find(([name]) =>
    name.toUpperCase().includes(upper) || upper.includes(name.toUpperCase())
  );
  return entry ? { name: entry[0], ...entry[1] } : null;
}
