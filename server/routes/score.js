// ═══════════════════════════════════════════════════════════
// routes/score.js — Latest Score Endpoint
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { getLastMatchData, getServiceStatus } = require('../services/espnService');
const { getLatestOdds } = require('../services/socketService');

/**
 * GET /api/score/live
 * Returns latest match data + service status.
 */
router.get('/live', (req, res) => {
  const matchData = getLastMatchData();
  const serviceStatus = getServiceStatus();

  res.json({
    ...matchData,
    serviceStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/score/odds
 * Returns latest calculated odds for all live markets.
 */
router.get('/odds', (req, res) => {
  const odds = getLatestOdds();
  res.json({
    markets: odds,
    count: odds.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/score/status
 * Returns service health + data source status.
 */
router.get('/status', (req, res) => {
  const serviceStatus = getServiceStatus();
  res.json({
    ...serviceStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/score/test-espn
 */
router.get('/test-espn', async (req, res) => {
  try {
    const axios = require('axios')
    const url = 'https://site.api.espn.com/apis/site/v2/sports/cricket/ipl/scoreboard'

    const response = await axios.get(
      url, { timeout: 5000 }
    )

    res.json({
      status: 'success',
      espn_status: response.status,
      data_keys: Object.keys(
        response.data || {}),
      raw_sample: JSON.stringify(
        response.data
      ).substring(0, 500)
    })

  } catch (error) {
    res.json({
      status: 'failed',
      error: error.message,
      error_code: error.response
        ?.status || 'no_response',
      note: error.response?.status === 404
        ? 'No live IPL matches right now — expected before March 28'
        : 'Unexpected error'
    })
  }
})

/**
 * GET /api/score/test-ml
 */
router.get('/test-ml', async (req, res) => {
  try {
    const axios = require('axios')
    const ML_API_URL =
      process.env.ML_API_URL

    if (!ML_API_URL) {
      return res.json({
        status: 'not_configured',
        note: 'ML_API_URL not in .env'
      })
    }

    const response = await axios.post(
      `${ML_API_URL}/predict`,
      {
        batting_team:
          'Chennai Super Kings',
        bowling_team:
          'Mumbai Indians',
        city: 'Chennai',
        runs_left: 67,
        balls_left: 42,
        wickets_remaining: 7,
        crr: 8.31,
        rrr: 9.57,
        over_number: 13,
        total_extras: 8,
        extras_rate: 0.62
      },
      { timeout: 5000 }
    )

    res.json({
      status: 'success',
      ml_api_url: ML_API_URL,
      prediction: response.data,
      integration: '✅ ML API working!'
    })

  } catch (error) {
    res.json({
      status: 'failed',
      error: error.message,
      ml_api_url:
        process.env.ML_API_URL,
      note: 'Check ML API is deployed'
    })
  }
})

module.exports = router;
