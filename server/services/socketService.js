// ═══════════════════════════════════════════════════════════
// services/socketService.js — Socket.io Emit Manager
// Emits score_update every 10s and odds_update every 15s
// ═══════════════════════════════════════════════════════════

const { fetchScoreboard, getServiceStatus } = require('./espnService');
const { generateAllMarketOdds } = require('./oddsEngine');

// ── State ────────────────────────────────────────────────
let previousOdds = {};     // For movement tracking (marketId_selection → odds)
let latestMatchData = null; // Latest parsed match data
let latestOdds = [];        // Latest calculated odds

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || 10000);    // 10s
const ODDS_INTERVAL = parseInt(process.env.ODDS_INTERVAL_MS || 15000);    // 15s

/**
 * Start the real-time Socket.io emit loops.
 * @param {import('socket.io').Server} io
 */
function startSocketService(io) {
  console.log(`📡 Socket service starting...`);
  console.log(`   Score poll: every ${POLL_INTERVAL / 1000}s`);
  console.log(`   Odds emit:  every ${ODDS_INTERVAL / 1000}s`);

  // ── Score polling loop (every 10s) ─────────────────────
  async function pollScores() {
    try {
      const data = await fetchScoreboard();
      latestMatchData = data;

      const payload = {
        matches: data.matches || [],
        isDelayed: data.isDelayed || false,
        delayMessage: data.delayMessage || null,
        source: data.source || 'espn',
        timestamp: new Date().toISOString(),
        serviceStatus: getServiceStatus(),
        // Include extrasData per match — clients need this
        // to show extras in scoreboard + free hit badge
        // (extrasData is already inside each match object)
      };

      io.emit('score_update', payload);

      const liveCount = (data.matches || []).filter((m) => m.isLive).length;
      if (liveCount > 0) {
        console.log(`🏏 Score update sent — ${liveCount} live match(es) | source: ${data.source}`);
      }
    } catch (err) {
      console.error('❌ Score polling error:', err.message);
      // Emit error state so clients can show appropriate UI
      io.emit('score_update', {
        matches: [],
        isDelayed: true,
        delayMessage: 'Score service temporarily unavailable',
        source: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── Odds calculation loop (every 15s) ─────────────────
  async function calculateAndEmitOdds() {
    try {
      if (!latestMatchData || !latestMatchData.matches) {
        return;
      }

      const liveMatches = latestMatchData.matches.filter((m) => m.isLive);
      if (liveMatches.length === 0) return;

      // Run all ML calls in parallel for each live match
      const oddsPerMatch = await Promise.all(
        liveMatches.map((match) => generateAllMarketOdds(match, previousOdds))
      );

      const allOdds = [];
      for (const marketOdds of oddsPerMatch) {
        allOdds.push(...marketOdds);
        // Store for movement tracking on next cycle
        marketOdds.forEach((m) => {
          previousOdds[`${m.marketId}_${m.selection}`] = m.odds;
        });
      }

      latestOdds = allOdds;

      if (allOdds.length > 0) {
        // Gather freehitActive + extrasImpact across live matches
        const freehitActive = liveMatches.some((m) => m.extrasData?.freehitActive || false);
        const extrasImpact  = liveMatches.reduce((sum, m) => sum + (m.extrasData?.extrasRate || 0), 0)
          / liveMatches.length;

        io.emit('odds_update', {
          markets: allOdds,
          timestamp: new Date().toISOString(),
          freehitActive,
          extrasImpact: parseFloat(extrasImpact.toFixed(4)),
        });
        console.log(`📊 Odds update sent — ${allOdds.length} market selections across live matches`);
      }
    } catch (err) {
      console.error('❌ Odds calculation error:', err.message);
    }
  }

  // ── Initial fetch, then start intervals ────────────────
  pollScores();
  setTimeout(calculateAndEmitOdds, 2000); // slight delay for first odds calc

  setInterval(pollScores, POLL_INTERVAL);
  setInterval(calculateAndEmitOdds, ODDS_INTERVAL);

  console.log('✅ Socket service running\n');
}

/**
 * Get latest match data (for REST endpoints).
 */
function getLatestMatchData() {
  return latestMatchData;
}

/**
 * Get latest calculated odds (for REST endpoints).
 */
function getLatestOdds() {
  return latestOdds;
}

module.exports = {
  startSocketService,
  getLatestMatchData,
  getLatestOdds,
};
