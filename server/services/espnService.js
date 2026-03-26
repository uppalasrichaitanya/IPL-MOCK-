// ═══════════════════════════════════════════════════════════
// services/espnService.js — ESPN Cricinfo API Poller
// Polls every 10 seconds, parses live IPL match data,
// tracks consecutive failures for fallback trigger
// ═══════════════════════════════════════════════════════════

const axios = require('axios');
const { getCricbuzzFallback } = require('./cricbuzzFallback');

// ── ESPN API endpoints ───────────────────────────────────
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/cricket';
const ESPN_SCOREBOARD = `${ESPN_BASE}/ipl/scoreboard`;
const ESPN_MATCH = (matchId) => `${ESPN_BASE}/summary?event=${matchId}`;

// ── State tracking ───────────────────────────────────────
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_FALLBACK = 3;
let usingFallback = false;
let lastGoodData = null;
let pollInterval = null;

// ── Parsed match state shape ─────────────────────────────
// Each match produces an object with this structure:
// {
//   matchId, status, venue, teams[], innings[],
//   currentBatsmen[], currentBowler, lastSixBalls[],
//   crr, rrr, target, runsNeeded, ballsRemaining,
//   overs, wickets, score, isLive, lastUpdated,
//   extrasData: { widesThisInnings, noBallsThisInnings,
//     byesThisInnings, legByesThisInnings, totalExtras,
//     extrasThisOver, lastBallWasNoBall, lastBallWasWide,
//     freehitActive, extrasRate }
// }

/**
 * Parse raw ESPN API response into clean match state
 */
function parseESPNMatch(event) {
  try {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const teams = competition.competitors?.map((team) => ({
      id: team.id,
      name: team.team?.displayName || team.team?.name || 'Unknown',
      abbreviation: team.team?.abbreviation || '???',
      score: team.score || '0',
      wickets: team.statistics?.find((s) => s.name === 'wickets')?.value || '0',
      overs: team.statistics?.find((s) => s.name === 'overs')?.value || '0',
      isHome: team.homeAway === 'home',
      logo: team.team?.logo || '',
    })) || [];

    // Parse innings details from situation if available
    const situation = event.situation || {};
    const lastBallCommentary = event.lastFiveBallCommentary || [];

    // Extract last 6 balls from commentary
    const lastSixBalls = lastBallCommentary.slice(0, 6).map((ball) => {
      const text = ball.text || ball.shortText || '';
      if (text.includes('WICKET') || text.includes('out')) return 'W';
      if (text.includes('SIX') || text.includes('6 runs')) return '6';
      if (text.includes('FOUR') || text.includes('4 runs')) return '4';
      if (text.includes('no run') || text.includes('dot')) return '•';
      const runs = parseInt(text.match(/(\d+) run/)?.[1] || '0');
      return runs === 0 ? '•' : String(runs);
    });

    // Current batsmen
    const currentBatsmen = (situation.batsmen || []).map((b) => ({
      name: b.athlete?.displayName || b.athlete?.shortName || 'Unknown',
      runs: parseInt(b.totalRuns || 0),
      balls: parseInt(b.ballsFaced || 0),
      strikeRate: parseFloat(b.strikeRate || 0).toFixed(1),
      onStrike: b.onStrike || false,
    }));

    // Current bowler
    const bowler = situation.bowler;
    const currentBowler = bowler ? {
      name: bowler.athlete?.displayName || bowler.athlete?.shortName || 'Unknown',
      overs: bowler.overs || '0',
      maidens: bowler.maidens || '0',
      runs: bowler.conceded || '0',
      wickets: bowler.wickets || '0',
    } : null;

    // ── Extract extras data ──────────────────────────────
    // ESPN may provide extras in the innings object or situation
    const innings       = situation.currentInningsData || situation.innings || {};
    const currentOver   = situation.currentOverData    || situation.currentOverObj || {};
    const lastDelivery  = situation.lastDelivery       || situation.lastBall       || {};

    const widesThisInnings   = parseInt(innings.wides    || innings.Wides    || 0);
    const noBallsThisInnings = parseInt(innings.noballs  || innings.Noballs  || innings.noBalls || 0);
    const byesThisInnings    = parseInt(innings.byes     || innings.Byes     || 0);
    const legByesThisInnings = parseInt(innings.legbyes  || innings.Legbyes  || innings.legByes || 0);
    const totalExtras        = parseInt(
      innings.extras || innings.Extras ||
      (widesThisInnings + noBallsThisInnings + byesThisInnings + legByesThisInnings) ||
      0
    );

    const extrasThisOver = parseInt(
      currentOver.extras || currentOver.extraRuns || 0
    );

    // Last delivery type detection
    const lastDeliveryType   = (lastDelivery.type || lastDelivery.deliveryType || '').toLowerCase();
    const lastBallWasNoBall  = lastDeliveryType === 'noball' || lastDeliveryType === 'no ball' || false;
    const lastBallWasWide    = lastDeliveryType === 'wide'   || false;
    // Free hit = next ball if last delivery was a no ball
    const freehitActive      = lastBallWasNoBall;

    const currentOverNum = parseFloat(situation.currentOver || 1);
    const extrasRate     = parseFloat(
      (totalExtras / Math.max(currentOverNum, 1)).toFixed(2)
    );

    const extrasData = {
      widesThisInnings,
      noBallsThisInnings,
      byesThisInnings,
      legByesThisInnings,
      totalExtras,
      extrasThisOver,
      lastBallWasNoBall,
      lastBallWasWide,
      freehitActive,
      extrasRate,
    };

    const matchState = {
      matchId: event.id,
      status: event.status?.type?.description || 'Unknown',
      statusDetail: event.status?.type?.detail || '',
      venue: competition.venue?.fullName || 'Unknown Venue',
      isLive: event.status?.type?.state === 'in',
      isComplete: event.status?.type?.completed || false,

      teams,
      currentBatsmen,
      currentBowler,
      lastSixBalls,

      // Run rate data
      crr: parseFloat(situation.currentRunRate || 0).toFixed(2),
      rrr: parseFloat(situation.requiredRunRate || 0).toFixed(2),
      target: parseInt(situation.target || 0),
      runsNeeded: parseInt(situation.remainingRuns || 0),
      ballsRemaining: parseInt(situation.remainingBalls || 0),

      // Current innings summary
      currentInnings: situation.currentInnings || 1,
      overs: parseFloat(situation.currentOver || 0),
      totalOvers: 20,

      // Powerplay info
      isPowerplay: parseFloat(situation.currentOver || 0) < 6,

      // Partnership
      partnership: {
        runs: parseInt(situation.partnershipRuns || 0),
        balls: parseInt(situation.partnershipBalls || 0),
      },

      // Recent overs (for momentum calc)
      recentOvers: (situation.recentOvers || []).slice(0, 3),

      // Extras tracking (NEW)
      extrasData,

      lastUpdated: new Date().toISOString(),
    };

    return matchState;
  } catch (err) {
    console.error('❌ Error parsing ESPN match data:', err.message);
    return null;
  }
}

/**
 * Fetch all live/upcoming IPL matches from ESPN scoreboard
 */
async function fetchScoreboard() {
  try {
    const response = await axios.get(ESPN_SCOREBOARD, { timeout: 8000 });
    const events = response.data?.events || [];
    consecutiveFailures = 0;
    usingFallback = false;

    const matches = events
      .map(parseESPNMatch)
      .filter(Boolean);

    if (matches.length > 0) {
      lastGoodData = { matches, timestamp: new Date().toISOString(), source: 'espn' };
    }

    return lastGoodData || { matches: [], timestamp: new Date().toISOString(), source: 'espn' };
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures > MAX_FAILURES_BEFORE_FALLBACK) {
      consecutiveFailures = MAX_FAILURES_BEFORE_FALLBACK;
    }
    console.error(`⚠️  ESPN fetch failed (${consecutiveFailures}/${MAX_FAILURES_BEFORE_FALLBACK}):`, err.message);

    // Trigger fallback after 3 consecutive failures
    if (consecutiveFailures >= MAX_FAILURES_BEFORE_FALLBACK) {
      console.log('🔄 Switching to Cricbuzz fallback...');
      usingFallback = true;
      consecutiveFailures = 0; // Reset counter to 0 after switching

      try {
        const fallbackData = await getCricbuzzFallback();
        if (fallbackData && fallbackData.matches?.length > 0) {
          lastGoodData = { ...fallbackData, source: 'cricbuzz_fallback' };
        }
      } catch (fallbackErr) {
        console.error('❌ Cricbuzz fallback also failed:', fallbackErr.message);
      }
    }

    // Return last known good data with delayed badge
    if (lastGoodData) {
      return {
        ...lastGoodData,
        isDelayed: true,
        delayMessage: 'Score temporarily delayed',
      };
    }

    return { matches: [], timestamp: new Date().toISOString(), source: 'none', isDelayed: true };
  }
}

/**
 * Fetch detailed match data for a specific match
 */
async function fetchMatchDetail(matchId) {
  try {
    const response = await axios.get(ESPN_MATCH(matchId), { timeout: 8000 });
    consecutiveFailures = 0;
    return parseESPNMatch(response.data);
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures > MAX_FAILURES_BEFORE_FALLBACK) {
      consecutiveFailures = MAX_FAILURES_BEFORE_FALLBACK;
    }
    console.error(`⚠️  ESPN match detail fetch failed for ${matchId}:`, err.message);
    return null;
  }
}

/**
 * Get current service status
 */
function getServiceStatus() {
  return {
    usingFallback,
    consecutiveFailures,
    hasData: !!lastGoodData,
    lastDataSource: lastGoodData?.source || 'none',
    lastUpdated: lastGoodData?.timestamp || null,
  };
}

/**
 * Get last known match data (for REST endpoint)
 */
function getLastMatchData() {
  return lastGoodData;
}

module.exports = {
  fetchScoreboard,
  fetchMatchDetail,
  getServiceStatus,
  getLastMatchData,
  parseESPNMatch,
};
