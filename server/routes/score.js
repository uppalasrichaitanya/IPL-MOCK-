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

module.exports = router;
