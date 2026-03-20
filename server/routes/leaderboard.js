// ═══════════════════════════════════════════════════════════
// routes/leaderboard.js — Leaderboard Fetch
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

/**
 * GET /api/leaderboard
 * Fetch leaderboard by tab:
 *   ?tab=balance (default) | win_rate | biggest_win | roi
 */
router.get('/', async (req, res) => {
  try {
    const tab = req.query.tab || 'balance';
    const validTabs = ['balance', 'win_rate', 'biggest_win', 'roi'];

    if (!validTabs.includes(tab)) {
      return res.status(400).json({ error: `Invalid tab. Use: ${validTabs.join(', ')}` });
    }

    // Try cache first
    const { data: cached, error: cacheErr } = await supabase
      .from('leaderboard_cache')
      .select('*, users!inner(username)')
      .order(tab, { ascending: false })
      .limit(20);

    if (!cacheErr && cached && cached.length > 0) {
      // Check cache freshness (5 min)
      const cacheAge = Date.now() - new Date(cached[0].updated_at).getTime();
      if (cacheAge < 5 * 60 * 1000) {
        return res.json({
          leaderboard: cached.map((entry, i) => ({
            rank: i + 1,
            userId: entry.user_id,
            username: entry.users?.username || 'Unknown',
            balance: entry.balance,
            winRate: entry.win_rate,
            totalBets: entry.total_bets,
            biggestWin: entry.biggest_win,
            roi: entry.roi,
          })),
          source: 'cache',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Rebuild from users table
    const orderColumn = tab === 'win_rate' ? 'total_won' : tab;
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, balance, total_bets, total_won, total_lost, biggest_win')
      .order(orderColumn, { ascending: false })
      .limit(20);

    if (error) throw error;

    const leaderboard = (users || []).map((user, i) => {
      const totalBets = user.total_won + user.total_lost;
      const winRate = totalBets > 0 ? ((user.total_won / totalBets) * 100).toFixed(1) : '0.0';
      const roi = totalBets > 0 ? (((user.balance - 10000) / 10000) * 100).toFixed(1) : '0.0';

      return {
        rank: i + 1,
        userId: user.id,
        username: user.username,
        balance: user.balance,
        winRate: parseFloat(winRate),
        totalBets: user.total_bets || 0,
        biggestWin: user.biggest_win || 0,
        roi: parseFloat(roi),
      };
    });

    // Update cache
    for (const entry of leaderboard) {
      await supabase
        .from('leaderboard_cache')
        .upsert({
          user_id: entry.userId,
          balance: entry.balance,
          win_rate: entry.winRate,
          total_bets: entry.totalBets,
          biggest_win: entry.biggestWin,
          roi: entry.roi,
          rank: entry.rank,
          updated_at: new Date().toISOString(),
        });
    }

    res.json({ leaderboard, source: 'live', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get a specific user's rank.
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, balance, total_bets, total_won, total_lost, biggest_win')
      .eq('id', req.params.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count how many users have higher balance
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('balance', user.balance);

    const rank = (count || 0) + 1;
    const totalBets = user.total_won + user.total_lost;
    const winRate = totalBets > 0 ? ((user.total_won / totalBets) * 100).toFixed(1) : '0.0';

    res.json({
      rank,
      userId: user.id,
      username: user.username,
      balance: user.balance,
      winRate: parseFloat(winRate),
      totalBets: user.total_bets,
      biggestWin: user.biggest_win,
    });
  } catch (err) {
    console.error('User rank error:', err.message);
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

module.exports = router;
