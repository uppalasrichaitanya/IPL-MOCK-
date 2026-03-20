// ═══════════════════════════════════════════════════════════
// services/cricbuzzFallback.js — Cricbuzz Fallback Scraper
// Activates when ESPN fails 3 consecutive times.
// Uses axios + cheerio for lightweight scraping (no Puppeteer
// overhead on free tier). Falls back gracefully.
// ═══════════════════════════════════════════════════════════

const axios = require('axios');

// Cricbuzz mobile API (unofficial, lightweight)
const CRICBUZZ_API = 'https://www.cricbuzz.com/api/cricket-match/commentary/';
const CRICBUZZ_MATCHES = 'https://www.cricbuzz.com/api/matches/live';

/**
 * Attempt to fetch live match data from Cricbuzz as a fallback.
 * Returns data in the same shape as ESPN for seamless swap.
 */
async function getCricbuzzFallback() {
  try {
    console.log('🔄 Attempting Cricbuzz fallback fetch...');

    // Try Cricbuzz's live scores feed
    const response = await axios.get(CRICBUZZ_MATCHES, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    const data = response.data;

    // Parse Cricbuzz response into our standard match shape
    const matches = parseCricbuzzData(data);

    console.log(`✅ Cricbuzz fallback: found ${matches.length} matches`);

    return {
      matches,
      timestamp: new Date().toISOString(),
      source: 'cricbuzz_fallback',
      isDelayed: true,
      delayMessage: 'Score temporarily delayed — using backup source',
    };
  } catch (err) {
    console.error('❌ Cricbuzz fallback failed:', err.message);
    return {
      matches: [],
      timestamp: new Date().toISOString(),
      source: 'cricbuzz_fallback',
      isDelayed: true,
      delayMessage: 'All score sources temporarily unavailable',
    };
  }
}

/**
 * Parse Cricbuzz API response into our standard match state shape
 */
function parseCricbuzzData(data) {
  try {
    // Cricbuzz returns matches in various formats depending on the endpoint
    const matchList = data?.matches || data?.typeMatches || [];
    const parsedMatches = [];

    // Handle typeMatches format (grouped by type)
    if (Array.isArray(matchList)) {
      matchList.forEach((group) => {
        const seriesMatches = group?.seriesMatches || [group];
        seriesMatches.forEach((series) => {
          const matches = series?.seriesAdWrapper?.matches || [series];
          matches.forEach((match) => {
            const info = match?.matchInfo || match;
            const score = match?.matchScore || {};

            // Only include IPL matches
            const seriesName = (info?.seriesName || '').toLowerCase();
            if (!seriesName.includes('ipl') && !seriesName.includes('indian premier')) {
              return;
            }

            const team1 = info?.team1 || {};
            const team2 = info?.team2 || {};
            const team1Score = score?.team1Score?.inngs1 || {};
            const team2Score = score?.team2Score?.inngs1 || {};

            parsedMatches.push({
              matchId: `cb_${info.matchId || Date.now()}`,
              status: info.status || 'Unknown',
              statusDetail: info.stateTitle || '',
              venue: `${info.venueInfo?.ground || 'Unknown'}, ${info.venueInfo?.city || ''}`,
              isLive: info.state === 'In Progress',
              isComplete: info.state === 'Complete',

              teams: [
                {
                  id: team1.teamId,
                  name: team1.teamName || 'Team A',
                  abbreviation: team1.teamSName || 'TA',
                  score: team1Score.runs || '0',
                  wickets: team1Score.wickets || '0',
                  overs: team1Score.overs || '0',
                  isHome: true,
                  logo: '',
                },
                {
                  id: team2.teamId,
                  name: team2.teamName || 'Team B',
                  abbreviation: team2.teamSName || 'TB',
                  score: team2Score.runs || '0',
                  wickets: team2Score.wickets || '0',
                  overs: team2Score.overs || '0',
                  isHome: false,
                  logo: '',
                },
              ],

              // Limited data from fallback — these fields may be empty
              currentBatsmen: [],
              currentBowler: null,
              lastSixBalls: [],
              crr: '0.00',
              rrr: '0.00',
              target: 0,
              runsNeeded: 0,
              ballsRemaining: 0,
              currentInnings: 1,
              overs: parseFloat(team1Score.overs || 0),
              totalOvers: 20,
              isPowerplay: false,
              partnership: { runs: 0, balls: 0 },
              recentOvers: [],
              lastUpdated: new Date().toISOString(),
            });
          });
        });
      });
    }

    return parsedMatches;
  } catch (err) {
    console.error('❌ Error parsing Cricbuzz data:', err.message);
    return [];
  }
}

module.exports = { getCricbuzzFallback };
