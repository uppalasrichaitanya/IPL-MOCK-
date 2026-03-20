// ═══════════════════════════════════════════════════════════
// routes/bets.js — Place, Settle, and Cash Out Bets
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { calculateCashOutValue } = require('../services/oddsEngine');
const { getLatestOdds } = require('../services/socketService');

/**
 * POST /api/bets/place
 * Place a new bet.
 */
router.post('/place', async (req, res) => {
  try {
    const { userId, matchId, marketId, marketName, selection, stake, odds } = req.body;

    // Validation
    if (!userId || !matchId || !marketId || !selection || !stake || !odds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (stake < 50) {
      return res.status(400).json({ error: 'Minimum bet is ₹50' });
    }

    // Check user balance
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, balance')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < stake) {
      return res.status(400).json({ error: 'Insufficient balance', balance: user.balance });
    }

    // Check if market is locked
    const currentOdds = getLatestOdds();
    const marketOdd = currentOdds.find(
      (m) => m.marketId === marketId && m.selection === selection
    );
    if (marketOdd?.locked) {
      return res.status(400).json({ error: 'Market is locked — betting suspended' });
    }

    const potentialReturn = parseFloat((stake * odds).toFixed(2));

    // Place bet
    const { data: bet, error: betErr } = await supabase
      .from('bets')
      .insert({
        user_id: userId,
        match_id: matchId,
        market_id: marketId,
        market_name: marketName || marketId,
        selection,
        stake,
        odds_at_placement: odds,
        potential_return: potentialReturn,
        status: 'pending',
      })
      .select()
      .single();

    if (betErr) throw betErr;

    // Deduct balance
    const newBalance = user.balance - stake;
    await supabase
      .from('users')
      .update({
        balance: newBalance,
        total_bets: user.total_bets ? user.total_bets + 1 : 1,
      })
      .eq('id', userId);

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'bet',
      amount: -stake,
      balance_after: newBalance,
      description: `Bet ₹${stake} on ${marketName} — ${selection} @ ${odds}`,
    });

    res.status(201).json({ bet, newBalance });
  } catch (err) {
    console.error('Bet placement error:', err.message);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

/**
 * POST /api/bets/cashout
 * Cash out an active bet.
 */
router.post('/cashout', async (req, res) => {
  try {
    const { betId, userId, percentage = 100 } = req.body;

    // Fetch bet
    const { data: bet, error: betErr } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (betErr || !bet) {
      return res.status(404).json({ error: 'Active bet not found' });
    }

    // Get current probability for this market
    const currentOdds = getLatestOdds();
    const marketOdd = currentOdds.find(
      (m) => m.marketId === bet.market_id && m.selection === bet.selection
    );

    if (!marketOdd) {
      return res.status(400).json({ error: 'Market odds not available for cash out' });
    }

    const originalProb = 1 / bet.odds_at_placement;
    const currentProb = marketOdd.probability;

    const fullCashOut = calculateCashOutValue(bet.stake, originalProb, currentProb);
    const cashOutAmount = Math.round((fullCashOut * percentage) / 100);
    const cashOutPortion = percentage / 100;

    // Fetch user
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    const newBalance = (user?.balance || 0) + cashOutAmount;
    const profitLoss = cashOutAmount - Math.round(bet.stake * cashOutPortion);

    if (percentage >= 100) {
      // Full cash out
      await supabase
        .from('bets')
        .update({
          status: 'cashed_out',
          cash_out_value: cashOutAmount,
          profit_loss: profitLoss,
          settled_at: new Date().toISOString(),
        })
        .eq('id', betId);
    } else {
      // Partial cash out — reduce stake, keep bet active
      const remainingStake = Math.round(bet.stake * (1 - cashOutPortion));
      await supabase
        .from('bets')
        .update({
          stake: remainingStake,
          potential_return: parseFloat((remainingStake * bet.odds_at_placement).toFixed(2)),
          cash_out_value: (bet.cash_out_value || 0) + cashOutAmount,
        })
        .eq('id', betId);
    }

    // Credit balance
    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'cashout',
      amount: cashOutAmount,
      balance_after: newBalance,
      description: `Cashed out ${percentage}% of ${bet.market_name} — ₹${cashOutAmount} (${profitLoss >= 0 ? '+' : ''}₹${profitLoss})`,
    });

    res.json({ cashOutAmount, profitLoss, newBalance, percentage });
  } catch (err) {
    console.error('Cash out error:', err.message);
    res.status(500).json({ error: 'Cash out failed' });
  }
});

/**
 * GET /api/bets/active/:userId
 * Get all active (pending) bets for a user.
 */
router.get('/active/:userId', async (req, res) => {
  try {
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', req.params.userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add live cash out values
    const currentOdds = getLatestOdds();
    const enrichedBets = (bets || []).map((bet) => {
      const marketOdd = currentOdds.find(
        (m) => m.marketId === bet.market_id && m.selection === bet.selection
      );
      const originalProb = 1 / bet.odds_at_placement;
      const currentProb = marketOdd?.probability || originalProb;
      const cashOutValue = calculateCashOutValue(bet.stake, originalProb, currentProb);

      return {
        ...bet,
        liveCashOutValue: cashOutValue,
        cashOutState: cashOutValue > bet.stake ? 'profit' : cashOutValue > bet.stake * 0.5 ? 'partial' : 'loss',
      };
    });

    res.json({ bets: enrichedBets });
  } catch (err) {
    console.error('Fetch active bets error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

/**
 * GET /api/bets/history/:userId
 * Get bet history for a user (all statuses).
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;

    let query = supabase
      .from('bets')
      .select('*', { count: 'exact' })
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: bets, count, error } = await query;

    if (error) throw error;
    res.json({ bets, total: count, page, totalPages: Math.ceil((count || 0) / limit) });
  } catch (err) {
    console.error('Fetch bet history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
