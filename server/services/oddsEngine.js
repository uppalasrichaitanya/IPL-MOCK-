// ═══════════════════════════════════════════════════════════
// services/oddsEngine.js — Core Odds Calculation Engine
// Runs every 15 seconds. Calculates win probability using:
//   1. Team strength ratings (base)
//   2. Run rate factor (sigmoid)
//   3. Wickets factor (death-aware)
//   4. Overs remaining volatility
//   5. Momentum factor (last 3 overs)
//   6. Powerplay factor
//   7. Extras factor
//   8. ML probability engine (Render) — hybrid blend
//
// House margin: 5% (configurable via .env)
// Probability clamped: 5% – 95%
// ═══════════════════════════════════════════════════════════

const axios = require('axios');

const HOUSE_MARGIN  = parseFloat(process.env.HOUSE_MARGIN  || 0.05);
const ML_API_URL    = process.env.ML_API_URL;
const ML_WEIGHT     = parseFloat(process.env.ML_WEIGHT     || '0.6');
const RULE_WEIGHT   = parseFloat(process.env.RULE_WEIGHT   || '0.4');
const ML_TIMEOUT    = parseInt(process.env.ML_TIMEOUT_MS   || '3000');

// ── IPL 2026 Team Strength Ratings ───────────────────────
const TEAM_RATINGS = {
  MI:   85, // Mumbai Indians
  CSK:  88, // Chennai Super Kings
  RCB:  82, // Royal Challengers Bengaluru
  KKR:  84, // Kolkata Knight Riders
  SRH:  80, // Sunrisers Hyderabad
  DC:   78, // Delhi Capitals
  PBKS: 76, // Punjab Kings
  RR:   83, // Rajasthan Royals
  GT:   86, // Gujarat Titans
  LSG:  79, // Lucknow Super Giants
};

// ── Star batsmen (top 3) per team for extra wicket penalty ──
const STAR_BATSMEN = {
  MI:   ['Rohit Sharma', 'Suryakumar Yadav', 'Ishan Kishan'],
  CSK:  ['Ruturaj Gaikwad', 'Shivam Dube', 'Devon Conway'],
  RCB:  ['Virat Kohli', 'Faf du Plessis', 'Glenn Maxwell'],
  KKR:  ['Shreyas Iyer', 'Venkatesh Iyer', 'Andre Russell'],
  SRH:  ['Travis Head', 'Heinrich Klaasen', 'Aiden Markram'],
  DC:   ['David Warner', 'Rishabh Pant', 'Jake Fraser-McGurk'],
  PBKS: ['Shikhar Dhawan', 'Jonny Bairstow', 'Liam Livingstone'],
  RR:   ['Yashasvi Jaiswal', 'Jos Buttler', 'Sanju Samson'],
  GT:   ['Shubman Gill', 'David Miller', 'Sai Sudharsan'],
  LSG:  ['KL Rahul', 'Quinton de Kock', 'Nicholas Pooran'],
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS: Sigmoid + Factor Functions
// ═══════════════════════════════════════════════════════════

/**
 * Sigmoid function — maps any real number to (0, 1)
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Run rate factor using sigmoid scaling.
 * Max adjustment ±12.5% (was linear ±3.5% per run delta)
 */
function runRateFactor(CRR, RRR) {
  const delta = CRR - RRR;
  // Sigmoid centered at 0; scale 0.3 controls steepness
  const adjustment = (sigmoid(delta * 0.3) - 0.5) * 0.25;
  return adjustment;
}

/**
 * Wickets factor — death-over aware.
 * Wickets hurt more when fewer overs remain.
 */
function wicketsFactor(wicketsFallen, starBatsmanOut, oversRemaining) {
  const deathMultiplier = oversRemaining < 5 ? 1.5 : 1.0;
  let adjustment = wicketsFallen * 0.045 * deathMultiplier;
  if (starBatsmanOut) {
    adjustment += 0.06 * deathMultiplier;
  }
  return -adjustment;
}

/**
 * Extras factor — 6 sub-factors reflecting bowling indiscipline.
 * Returns 0–0.15 (always benefits batting team).
 */
function extrasFactor(matchState) {
  const {
    extrasData     = {},
    currentOver    = 1,
    oversRemaining = 20,
  } = matchState;

  const {
    widesThisInnings   = 0,
    noBallsThisInnings = 0,
    byesThisInnings    = 0,
    legByesThisInnings = 0,
    totalExtras        = 0,
    extrasThisOver     = 0,
    lastBallWasNoBall  = false,
    freehitActive      = false,
    extrasRate         = 0,
  } = extrasData;

  const isDeathOvers = oversRemaining < 5;
  const isPowerplay  = currentOver <= 6;
  let adjustment     = 0;

  // ───────────────────────────────────
  // Factor 1: Wides Rate
  // ───────────────────────────────────
  const widesPerOver = widesThisInnings / Math.max(currentOver, 1);
  if (widesPerOver > 2)        adjustment += 0.04;
  else if (widesPerOver > 1)   adjustment += 0.02;
  else if (widesPerOver > 0.5) adjustment += 0.01;

  // Death overs wide amplification
  if (isDeathOvers && extrasThisOver >= 2) adjustment += 0.05;

  // ───────────────────────────────────
  // Factor 2: No Ball Impact + Free Hit
  // ───────────────────────────────────
  const noBallsPerOver = noBallsThisInnings / Math.max(currentOver, 1);
  if (noBallsPerOver > 1)      adjustment += 0.030;
  else if (noBallsPerOver > 0.5) adjustment += 0.015;

  if (freehitActive) {
    adjustment += isDeathOvers ? 0.07 : 0.04;
  }
  if (lastBallWasNoBall && !freehitActive) adjustment += 0.02;

  // ───────────────────────────────────
  // Factor 3: Total Extras Rate
  // ───────────────────────────────────
  if (extrasRate > 3)       adjustment += 0.05;
  else if (extrasRate > 2)  adjustment += 0.03;
  else if (extrasRate > 1.5) adjustment += 0.02;
  else if (extrasRate > 1)  adjustment += 0.01;

  // ───────────────────────────────────
  // Factor 4: Current Over Extras
  // ───────────────────────────────────
  if (extrasThisOver >= 3)      adjustment += 0.04;
  else if (extrasThisOver === 2) adjustment += 0.02;
  else if (extrasThisOver === 1) adjustment += 0.01;

  // ───────────────────────────────────
  // Factor 5: Powerplay Extras Penalty
  // ───────────────────────────────────
  if (isPowerplay && totalExtras > 6)       adjustment += 0.030;
  else if (isPowerplay && totalExtras > 4)  adjustment += 0.015;

  // ───────────────────────────────────
  // Factor 6: Extra Balls Available
  // ───────────────────────────────────
  const extraBallsGained = noBallsThisInnings + widesThisInnings;
  if (extraBallsGained > 15)      adjustment += 0.04;
  else if (extraBallsGained > 10) adjustment += 0.03;
  else if (extraBallsGained > 5)  adjustment += 0.01;

  // Clamp: max +15% from extras alone, min 0%
  return Math.min(0.15, Math.max(0, adjustment));
}

// ═══════════════════════════════════════════════════════════
// CORE: Calculate win probability for batting team
// ═══════════════════════════════════════════════════════════

/**
 * Calculate win probability for the batting team.
 * @param {Object} matchState — parsed match state from espnService
 * @returns {Object} { battingProb, bowlingProb }
 */
function calculateWinProbability(matchState) {
  if (!matchState || !matchState.teams || matchState.teams.length < 2) {
    return { battingProb: 0.5, bowlingProb: 0.5, extrasAdj: 0 };
  }

  const team1 = matchState.teams[0];
  const team2 = matchState.teams[1];

  // ── 1. Base probability from team ratings ──────────────
  const rating1 = TEAM_RATINGS[team1.abbreviation] || 80;
  const rating2 = TEAM_RATINGS[team2.abbreviation] || 80;
  const totalRating = rating1 + rating2;
  let battingProb = rating1 / totalRating; // team1 assumed batting

  // ── 2. Run rate factor (sigmoid) ───────────────────────
  const crr = parseFloat(matchState.crr || 0);
  const rrr = parseFloat(matchState.rrr || 0);
  const oversPlayed    = parseFloat(matchState.overs || 0);
  const oversRemaining = 20 - oversPlayed;

  if (rrr > 0 && matchState.currentInnings === 2) {
    battingProb += runRateFactor(crr, rrr);
  }

  // ── 3. Wickets factor (death-aware) ───────────────────
  const wicketsFallen    = parseInt(team1.wickets || 0);
  const battingTeamAbbr  = team1.abbreviation;
  const starPlayers      = STAR_BATSMEN[battingTeamAbbr] || [];
  const currentBatsmenNames = (matchState.currentBatsmen || []).map((b) => b.name);

  let starsDismissed = 0;
  if (wicketsFallen >= 3 && starPlayers.length > 0) {
    const starsAtCrease = starPlayers.filter((star) =>
      currentBatsmenNames.some((name) =>
        name.toLowerCase().includes(star.split(' ').pop().toLowerCase())
      )
    );
    starsDismissed = Math.max(0, Math.min(3, 3 - starsAtCrease.length));
  }

  battingProb += wicketsFactor(wicketsFallen, starsDismissed > 0, oversRemaining);
  // Extra penalty per star dismissed
  battingProb -= starsDismissed * 0.06;

  // ── 4. Overs remaining volatility ─────────────────────
  let volatilityMultiplier = 1.0;
  if (oversRemaining < 5) {
    volatilityMultiplier = 1.8;
  } else if (oversRemaining <= 10) {
    volatilityMultiplier = 1.4;
  }

  // Apply volatility — push probability further from 50%
  const deviation = battingProb - 0.5;
  battingProb = 0.5 + deviation * volatilityMultiplier;

  // ── 5. Momentum factor (last 3 overs) ─────────────────
  const recentOvers = matchState.recentOvers || [];
  if (recentOvers.length >= 2 && rrr > 0) {
    const recentRunsPerOver = recentOvers.reduce((sum, over) => {
      const overRuns = typeof over === 'number' ? over : parseInt(over?.runs || 0);
      return sum + overRuns;
    }, 0) / recentOvers.length;

    if (recentRunsPerOver > rrr) {
      battingProb += 0.05; // +5% above required rate
    } else if (recentRunsPerOver < rrr) {
      battingProb -= 0.05; // -5% below required rate
    }
  }

  // ── 6. Powerplay factor (overs 1–6) ───────────────────
  if (matchState.isPowerplay && oversPlayed >= 1) {
    if (wicketsFallen === 0) {
      battingProb += 0.08; // +8% no wickets in powerplay
    } else if (wicketsFallen >= 2) {
      battingProb -= 0.10; // -10% for 2+ wickets in powerplay
    }
  }

  // ── 7. Extras factor (NEW) ────────────────────────────
  const extrasAdj = extrasFactor({
    ...matchState,
    currentOver:   oversPlayed,
    oversRemaining,
  });
  battingProb += extrasAdj;

  // ── Clamp between 5% and 95% ──────────────────────────
  battingProb = Math.max(0.05, Math.min(0.95, battingProb));
  const bowlingProb = 1 - battingProb;

  return {
    battingProb: parseFloat(battingProb.toFixed(4)),
    bowlingProb: parseFloat(bowlingProb.toFixed(4)),
    extrasAdj:   parseFloat(extrasAdj.toFixed(4)),
  };
}


// ── Alias so getWeightedProbability can call it by name ──
const getRuleBasedProbability = (matchState) => calculateWinProbability(matchState).battingProb;

// ═══════════════════════════════════════════════════════════
// ML PROBABILITY ENGINE — calls Render API, silent fallback
// ═══════════════════════════════════════════════════════════

/**
 * Calls the ML prediction API on Render.
 * Returns { probability, confidence, source:'ml' } or null if API is down.
 */
async function getMLProbability(matchState) {
  if (!ML_API_URL) return null

  try {
    const response = await axios.post(
      `${ML_API_URL}/predict`,
      {
        batting_team:
          matchState.battingTeam ||
          'Mumbai Indians',
        bowling_team:
          matchState.bowlingTeam ||
          'Chennai Super Kings',
        city:
          matchState.city || 'Mumbai',
        runs_left:
          matchState.runsLeft || 0,
        balls_left:
          matchState.ballsLeft || 60,
        wickets_remaining:
          matchState.wicketsRemaining
          || 10,
        crr: matchState.CRR || 0,
        rrr: matchState.RRR || 0,
        over_number:
          matchState.currentOver || 10,
        total_extras:
          matchState.extrasData
            ?.totalExtras || 0,
        extras_rate:
          matchState.extrasData
            ?.extrasRate || 0,
        wides_this_innings:
          matchState.extrasData
            ?.widesThisInnings || 0,
        boundary_percentage: 0.25,
        dot_ball_percentage: 0.30,
        partnership_runs: 20,
        partnership_balls: 18,
        recent_12_balls_rr:
          matchState.recent12BallsRR
          || 0,
        last_3_overs_avg:
          matchState.last3OversAvg || 0
      },
      {
        timeout: ML_TIMEOUT,
        headers: {
          'Content-Type':
            'application/json'
        }
      }
    )

    const prob = response.data
      .batting_team_win_prob

    if (typeof prob === 'number'
        && prob >= 0.05
        && prob <= 0.95) {
      return {
        probability: prob,
        confidence:
          response.data.confidence,
        source: 'ml'
      }
    }
    return null

  } catch (error) {
    // Silent fallback — ML being down
    // should never crash the app
    return null
  }
}

/**
 * Hybrid probability: 60% ML + 40% rule-based when ML available.
 * Falls back gracefully to rule-based only.
 */
async function getWeightedProbability(
  matchState
) {
  const ruleProbability =
    getRuleBasedProbability(matchState)

  const mlResult =
    await getMLProbability(matchState)

  if (mlResult?.probability) {
    const final =
      (mlResult.probability * ML_WEIGHT)
      + (ruleProbability * RULE_WEIGHT)

    console.log(
      `📊 Odds: ML=${mlResult.probability
      .toFixed(3)} Rule=${ruleProbability
      .toFixed(3)} Final=${final.toFixed(3)
      } [${mlResult.source}]`
    )

    return {
      probability: final,
      source: 'hybrid'
    }
  }

  return {
    probability: ruleProbability,
    source: 'rule-based'
  }
}

// ═══════════════════════════════════════════════════════════
// Convert probability to decimal odds with house margin
// ═══════════════════════════════════════════════════════════

function probabilityToOdds(probability) {
  if (probability <= 0) return 99.0;
  if (probability >= 1) return 1.01;

  const decimalOdds = (1 / probability) * (1 - HOUSE_MARGIN);
  return parseFloat(Math.max(1.01, decimalOdds).toFixed(2));
}

function oddsToImpliedPct(odds) {
  if (odds <= 0) return '0.0%';
  return ((1 / odds) * 100).toFixed(1) + '%';
}

// ═══════════════════════════════════════════════════════════
// 26 BETTING MARKETS — Generate odds for all markets
// ═══════════════════════════════════════════════════════════

/**
 * Generate odds for all 28+ betting markets given current match state.
 * @param {Object} matchState
 * @param {Object|null} previousOdds — for movement tracking
 * @returns {Array} Array of market odds objects
 */
async function generateAllMarketOdds(matchState, previousOdds = {}) {
  if (!matchState) return [];

  // ── Hybrid probability (ML + rule-based) ──────────────
  const weighted  = await getWeightedProbability(matchState);
  const battingProb = weighted.probability;
  const bowlingProb = 1 - battingProb;

  // Still derive extrasAdj for per-market metadata
  const { extrasAdj } = calculateWinProbability(matchState);

  const markets = [];
  const now = new Date().toISOString();

  const overs = parseFloat(matchState.overs || 0);
  const score = parseInt(matchState.teams?.[0]?.score || 0);
  const wickets = parseInt(matchState.teams?.[0]?.wickets || 0);
  const isSecondInnings = matchState.currentInnings === 2;
  const target = matchState.target || 0;
  const crr = parseFloat(matchState.crr || 0);
  const freehitNow = matchState.extrasData?.freehitActive || false;

  // Helper: create market odds object with movement tracking + extras fields
  function makeMarket(marketId, marketName, selections) {
    return selections.map((sel) => {
      const prevOdd = previousOdds[`${marketId}_${sel.selection}`];
      let movement = 'same';
      if (prevOdd) {
        if (sel.odds > prevOdd) movement = 'up';
        else if (sel.odds < prevOdd) movement = 'down';
      }
      return {
        marketId,
        matchId: matchState.matchId,
        marketName,
        selection: sel.selection,
        probability: sel.probability,
        odds: sel.odds,
        impliedPct: oddsToImpliedPct(sel.odds),
        movement,
        locked: sel.locked || false,
        lastUpdated: now,
        // Extras impact fields (NEW)
        extrasImpact:  parseFloat((extrasAdj).toFixed(4)),
        freehitActive: freehitNow,
      };
    });
  }

  // ── M01: Match Winner ──────────────────────────────────
  markets.push(...makeMarket('M01', 'Match Winner', [
    { selection: matchState.teams[0]?.name || 'Team A', probability: battingProb, odds: probabilityToOdds(battingProb) },
    { selection: matchState.teams[1]?.name || 'Team B', probability: bowlingProb, odds: probabilityToOdds(bowlingProb) },
  ]));

  // ── M02: Toss Winner ──────────────────────────────────
  // Pure 50/50 pre-match, locked after toss
  const tossLocked = matchState.isLive || matchState.isComplete;
  markets.push(...makeMarket('M02', 'Toss Winner', [
    { selection: matchState.teams[0]?.name || 'Team A', probability: 0.50, odds: probabilityToOdds(0.50), locked: tossLocked },
    { selection: matchState.teams[1]?.name || 'Team B', probability: 0.50, odds: probabilityToOdds(0.50), locked: tossLocked },
  ]));

  // ── M03: Total Match Sixes — Over/Under ────────────────
  markets.push(...makeMarket('M03', 'Total Match Sixes', [
    { selection: 'Under 10.5', probability: 0.35, odds: probabilityToOdds(0.35) },
    { selection: '10.5 – 14.5', probability: 0.40, odds: probabilityToOdds(0.40) },
    { selection: 'Over 14.5', probability: 0.25, odds: probabilityToOdds(0.25) },
  ]));

  // ── M04: Top Team Batsman ──────────────────────────────
  const battingTeamAbbr = matchState.teams[0]?.abbreviation;
  const topBatsmen = (STAR_BATSMEN[battingTeamAbbr] || ['Player 1', 'Player 2', 'Player 3']);
  const batsmanProbs = [0.28, 0.25, 0.22, 0.15, 0.10];
  markets.push(...makeMarket('M04', 'Top Team Batsman', topBatsmen.map((name, i) => ({
    selection: name,
    probability: batsmanProbs[i] || 0.10,
    odds: probabilityToOdds(batsmanProbs[i] || 0.10),
  }))));

  // ── M05: First Wicket Method ───────────────────────────
  markets.push(...makeMarket('M05', 'First Wicket Method', [
    { selection: 'Caught', probability: 0.55, odds: probabilityToOdds(0.55) },
    { selection: 'Bowled', probability: 0.18, odds: probabilityToOdds(0.18) },
    { selection: 'LBW', probability: 0.12, odds: probabilityToOdds(0.12) },
    { selection: 'Run Out', probability: 0.08, odds: probabilityToOdds(0.08) },
    { selection: 'Other', probability: 0.07, odds: probabilityToOdds(0.07) },
  ]));

  // ── M06: Powerplay Score Range ─────────────────────────
  const ppLocked = overs >= 6;
  const ppProjection = overs > 0 ? (score / overs) * 6 : 45;
  markets.push(...makeMarket('M06', 'Powerplay Score Range', [
    { selection: '30–39', probability: ppProjection < 40 ? 0.30 : 0.15, odds: probabilityToOdds(ppProjection < 40 ? 0.30 : 0.15), locked: ppLocked },
    { selection: '40–49', probability: 0.25, odds: probabilityToOdds(0.25), locked: ppLocked },
    { selection: '50–59', probability: 0.25, odds: probabilityToOdds(0.25), locked: ppLocked },
    { selection: '60–69', probability: 0.15, odds: probabilityToOdds(0.15), locked: ppLocked },
    { selection: '70+', probability: ppProjection > 65 ? 0.20 : 0.10, odds: probabilityToOdds(ppProjection > 65 ? 0.20 : 0.10), locked: ppLocked },
  ]));

  // ── M07: Powerplay Wickets ─────────────────────────────
  markets.push(...makeMarket('M07', 'Powerplay Wickets', [
    { selection: '0 wickets', probability: 0.20, odds: probabilityToOdds(0.20), locked: ppLocked },
    { selection: '1 wicket', probability: 0.35, odds: probabilityToOdds(0.35), locked: ppLocked },
    { selection: '2 wickets', probability: 0.28, odds: probabilityToOdds(0.28), locked: ppLocked },
    { selection: '3+ wickets', probability: 0.17, odds: probabilityToOdds(0.17), locked: ppLocked },
  ]));

  // ── M08: Powerplay Boundary Count ─────────────────────
  markets.push(...makeMarket('M08', 'Powerplay Boundary Count', [
    { selection: 'Under 8', probability: 0.30, odds: probabilityToOdds(0.30), locked: ppLocked },
    { selection: '8–11', probability: 0.35, odds: probabilityToOdds(0.35), locked: ppLocked },
    { selection: '12–15', probability: 0.25, odds: probabilityToOdds(0.25), locked: ppLocked },
    { selection: 'Over 15', probability: 0.10, odds: probabilityToOdds(0.10), locked: ppLocked },
  ]));

  // ── M09: First Six of Match ───────────────────────────
  markets.push(...makeMarket('M09', 'First Six of Match', [
    { selection: 'Over 1', probability: 0.15, odds: probabilityToOdds(0.15) },
    { selection: 'Over 2', probability: 0.25, odds: probabilityToOdds(0.25) },
    { selection: 'Over 3', probability: 0.30, odds: probabilityToOdds(0.30) },
    { selection: 'Over 4–6', probability: 0.30, odds: probabilityToOdds(0.30) },
  ]));

  // ── M10: Runs in Next Over ─────────────────────────────
  // Locks at ball 4 of the current over
  const currentBall = Math.round((overs % 1) * 10);
  const overLocked = currentBall >= 4;
  markets.push(...makeMarket('M10', 'Runs in Next Over', [
    { selection: '0–4', probability: 0.20, odds: probabilityToOdds(0.20), locked: overLocked },
    { selection: '5–8', probability: 0.30, odds: probabilityToOdds(0.30), locked: overLocked },
    { selection: '9–12', probability: 0.28, odds: probabilityToOdds(0.28), locked: overLocked },
    { selection: '13–16', probability: 0.15, odds: probabilityToOdds(0.15), locked: overLocked },
    { selection: '17+', probability: 0.07, odds: probabilityToOdds(0.07), locked: overLocked },
  ]));

  // ── M11: Wicket in Next Over ───────────────────────────
  markets.push(...makeMarket('M11', 'Wicket in Next Over', [
    { selection: 'Yes', probability: 0.28, odds: probabilityToOdds(0.28), locked: overLocked },
    { selection: 'No', probability: 0.72, odds: probabilityToOdds(0.72), locked: overLocked },
  ]));

  // ── M12: Dot Balls This Over ───────────────────────────
  markets.push(...makeMarket('M12', 'Dot Balls This Over', [
    { selection: '0 dots', probability: 0.10, odds: probabilityToOdds(0.10), locked: overLocked },
    { selection: '1–2 dots', probability: 0.45, odds: probabilityToOdds(0.45), locked: overLocked },
    { selection: '3+ dots', probability: 0.45, odds: probabilityToOdds(0.45), locked: overLocked },
  ]));

  // ── M13: Maximum (Six) This Over ──────────────────────
  markets.push(...makeMarket('M13', 'Maximum (Six) This Over', [
    { selection: 'Yes', probability: 0.35, odds: probabilityToOdds(0.35), locked: overLocked },
    { selection: 'No', probability: 0.65, odds: probabilityToOdds(0.65), locked: overLocked },
  ]));

  // ── M14: Maiden Over ──────────────────────────────────
  markets.push(...makeMarket('M14', 'Exactly a Maiden Over', [
    { selection: 'Yes', probability: 0.03, odds: probabilityToOdds(0.03), locked: overLocked },
    { selection: 'No', probability: 0.97, odds: probabilityToOdds(0.97), locked: overLocked },
  ]));

  // ── M15: 1st Innings Total ─────────────────────────────
  const inningsLocked = overs >= 15 && !isSecondInnings;
  const projectedTotal = overs > 0 ? Math.round((score / overs) * 20) : 160;
  markets.push(...makeMarket('M15', '1st Innings Total', [
    { selection: '120–139', probability: projectedTotal < 145 ? 0.25 : 0.10, odds: probabilityToOdds(projectedTotal < 145 ? 0.25 : 0.10), locked: inningsLocked },
    { selection: '140–159', probability: 0.25, odds: probabilityToOdds(0.25), locked: inningsLocked },
    { selection: '160–179', probability: 0.25, odds: probabilityToOdds(0.25), locked: inningsLocked },
    { selection: '180–199', probability: projectedTotal > 175 ? 0.25 : 0.15, odds: probabilityToOdds(projectedTotal > 175 ? 0.25 : 0.15), locked: inningsLocked },
    { selection: '200–219', probability: projectedTotal > 195 ? 0.15 : 0.08, odds: probabilityToOdds(projectedTotal > 195 ? 0.15 : 0.08), locked: inningsLocked },
    { selection: '220+', probability: projectedTotal > 215 ? 0.10 : 0.04, odds: probabilityToOdds(projectedTotal > 215 ? 0.10 : 0.04), locked: inningsLocked },
  ]));

  // ── M16: Highest Scoring Over Group ────────────────────
  markets.push(...makeMarket('M16', 'Highest Scoring Over', [
    { selection: 'Overs 1–6', probability: 0.15, odds: probabilityToOdds(0.15) },
    { selection: 'Overs 7–11', probability: 0.20, odds: probabilityToOdds(0.20) },
    { selection: 'Overs 12–16', probability: 0.25, odds: probabilityToOdds(0.25) },
    { selection: 'Overs 17–20', probability: 0.40, odds: probabilityToOdds(0.40) },
  ]));

  // ── M17: Will Batsman Score 50+? ───────────────────────
  const currentBatsmen = matchState.currentBatsmen || [];
  currentBatsmen.forEach((bat) => {
    const runs = bat.runs || 0;
    const fiftyProb = Math.min(0.90, 0.15 + (runs / 50) * 0.65);
    markets.push(...makeMarket('M17', `Will ${bat.name} Score 50+?`, [
      { selection: 'Yes', probability: fiftyProb, odds: probabilityToOdds(fiftyProb) },
      { selection: 'No', probability: 1 - fiftyProb, odds: probabilityToOdds(1 - fiftyProb) },
    ]));
  });

  // ── M18: Will Batsman Score 100+? ─────────────────────
  // Only offered if batsman > 30 runs
  currentBatsmen.filter((b) => b.runs > 30).forEach((bat) => {
    const runs = bat.runs || 0;
    const centProb = Math.min(0.85, 0.05 + (runs / 100) * 0.60);
    markets.push(...makeMarket('M18', `Will ${bat.name} Score 100+?`, [
      { selection: 'Yes', probability: centProb, odds: probabilityToOdds(centProb) },
      { selection: 'No', probability: 1 - centProb, odds: probabilityToOdds(1 - centProb) },
    ]));
  });

  // ── M19: Fall of Next Wicket Score ─────────────────────
  markets.push(...makeMarket('M19', 'Fall of Next Wicket Score', [
    { selection: `+0–15 (${score}–${score + 15})`, probability: 0.30, odds: probabilityToOdds(0.30) },
    { selection: `+16–30 (${score + 16}–${score + 30})`, probability: 0.30, odds: probabilityToOdds(0.30) },
    { selection: `+31–50 (${score + 31}–${score + 50})`, probability: 0.25, odds: probabilityToOdds(0.25) },
    { selection: `+51+ (${score + 51}+)`, probability: 0.15, odds: probabilityToOdds(0.15) },
  ]));

  // ── M20: Total Fours in Match ─────────────────────────
  markets.push(...makeMarket('M20', 'Total Fours in Match', [
    { selection: 'Under 20', probability: 0.20, odds: probabilityToOdds(0.20) },
    { selection: '20–25', probability: 0.35, odds: probabilityToOdds(0.35) },
    { selection: '26–30', probability: 0.30, odds: probabilityToOdds(0.30) },
    { selection: 'Over 30', probability: 0.15, odds: probabilityToOdds(0.15) },
  ]));

  // ── M21: Match Result Margin (2nd innings only) ────────
  if (isSecondInnings) {
    markets.push(...makeMarket('M21', 'Match Result', [
      { selection: 'Batting wins by 6+ wkts', probability: battingProb * 0.30, odds: probabilityToOdds(battingProb * 0.30) },
      { selection: 'Batting wins by 3–5 wkts', probability: battingProb * 0.40, odds: probabilityToOdds(battingProb * 0.40) },
      { selection: 'Batting wins by 1–2 wkts', probability: battingProb * 0.30, odds: probabilityToOdds(battingProb * 0.30) },
      { selection: 'Bowling wins by 1–10 runs', probability: bowlingProb * 0.35, odds: probabilityToOdds(bowlingProb * 0.35) },
      { selection: 'Bowling wins by 11–25 runs', probability: bowlingProb * 0.40, odds: probabilityToOdds(bowlingProb * 0.40) },
      { selection: 'Bowling wins by 26+ runs', probability: bowlingProb * 0.25, odds: probabilityToOdds(bowlingProb * 0.25) },
    ]));
  }

  // ── M22: Will Match Go to Last Over? ──────────────────
  if (isSecondInnings && overs >= 15) {
    const lastOverProb = overs >= 18 ? 0.75 : 0.45;
    markets.push(...makeMarket('M22', 'Will Match Go to Last Over?', [
      { selection: 'Yes', probability: lastOverProb, odds: probabilityToOdds(lastOverProb) },
      { selection: 'No', probability: 1 - lastOverProb, odds: probabilityToOdds(1 - lastOverProb) },
    ]));
  }

  // ── M23: Method of Victory ────────────────────────────
  markets.push(...makeMarket('M23', 'Method of Victory', [
    { selection: 'Batting team wins', probability: battingProb, odds: probabilityToOdds(battingProb) },
    { selection: 'Bowling team wins', probability: bowlingProb * 0.95, odds: probabilityToOdds(bowlingProb * 0.95) },
    { selection: 'Super Over', probability: 0.02, odds: probabilityToOdds(0.02) },
  ]));

  // ── M24: Next Ball Outcome ─────────────────────────────
  // HIGH RISK: 15-second lock window
  markets.push(...makeMarket('M24', 'Next Ball Outcome', [
    { selection: 'Dot', probability: 0.38, odds: probabilityToOdds(0.38) },
    { selection: '1 run', probability: 0.28, odds: probabilityToOdds(0.28) },
    { selection: '2–3 runs', probability: 0.10, odds: probabilityToOdds(0.10) },
    { selection: 'Four', probability: 0.12, odds: probabilityToOdds(0.12) },
    { selection: 'Six', probability: 0.05, odds: probabilityToOdds(0.05) },
    { selection: 'Wicket', probability: 0.04, odds: probabilityToOdds(0.04) },
    { selection: 'Wide/No ball', probability: 0.03, odds: probabilityToOdds(0.03) },
  ]));

  // ── M25: Current Partnership Runs ─────────────────────
  const partnershipRuns = matchState.partnership?.runs || 0;
  markets.push(...makeMarket('M25', 'Current Partnership Runs', [
    { selection: 'Under 20', probability: partnershipRuns < 10 ? 0.35 : 0.15, odds: probabilityToOdds(partnershipRuns < 10 ? 0.35 : 0.15) },
    { selection: '20–39', probability: 0.28, odds: probabilityToOdds(0.28) },
    { selection: '40–59', probability: 0.20, odds: probabilityToOdds(0.20) },
    { selection: '60–79', probability: 0.10, odds: probabilityToOdds(0.10) },
    { selection: '80+', probability: 0.07, odds: probabilityToOdds(0.07) },
  ]));

  // ── M26: Team Score at Over 10 (2nd innings) ──────────
  if (isSecondInnings && overs < 10) {
    const halfway = Math.round(target / 2);
    markets.push(...makeMarket('M26', 'Team Score at Over 10', [
      { selection: 'Behind by 20+', probability: 0.25, odds: probabilityToOdds(0.25) },
      { selection: 'Behind 1–19', probability: 0.30, odds: probabilityToOdds(0.30) },
      { selection: 'Ahead by 1–19', probability: 0.30, odds: probabilityToOdds(0.30) },
      { selection: 'Ahead 20+', probability: 0.15, odds: probabilityToOdds(0.15) },
    ]));
  }

  return markets;
}

// ═══════════════════════════════════════════════════════════
// Cash out value calculation
// ═══════════════════════════════════════════════════════════

/**
 * Calculate the live cash out value of a bet.
 * cashOutValue = stake × (currentWinProbability / originalWinProbability)
 * Rounded to nearest ₹10.
 */
function calculateCashOutValue(stake, originalProbability, currentProbability) {
  if (originalProbability <= 0 || currentProbability <= 0) return 0;

  const rawValue = stake * (currentProbability / originalProbability);
  return Math.round(rawValue / 10) * 10; // Round to nearest ₹10
}

module.exports = {
  calculateWinProbability,
  getRuleBasedProbability,
  getMLProbability,
  getWeightedProbability,
  probabilityToOdds,
  oddsToImpliedPct,
  generateAllMarketOdds,
  calculateCashOutValue,
  TEAM_RATINGS,
  STAR_BATSMEN,
};
