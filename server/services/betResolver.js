// ═══════════════════════════════════════════════════════════
// services/betResolver.js — Auto-settle Finished Markets
// Runs after each over / match event to resolve bets
// ═══════════════════════════════════════════════════════════

const { supabase } = require('../db/supabase');

/**
 * Settle all pending bets for a given market + match.
 * @param {string} matchId
 * @param {string} marketId
 * @param {string} winningSelection — the selection that won
 */
async function settleBets(matchId, marketId, winningSelection) {
  try {
    // Fetch all pending bets for this market
    const { data: pendingBets, error: fetchErr } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', matchId)
      .eq('market_id', marketId)
      .eq('status', 'pending');

    if (fetchErr) {
      console.error(`❌ Error fetching bets for ${marketId}:`, fetchErr.message);
      return;
    }

    if (!pendingBets || pendingBets.length === 0) return;

    console.log(`⚖️  Settling ${pendingBets.length} bets for market ${marketId}`);

    for (const bet of pendingBets) {
      const isWin = bet.selection === winningSelection;
      const profitLoss = isWin
        ? Math.round(bet.stake * bet.odds_at_placement - bet.stake)
        : -bet.stake;

      const newStatus = isWin ? 'won' : 'lost';

      // Update bet record
      await supabase
        .from('bets')
        .update({
          status: newStatus,
          profit_loss: profitLoss,
          settled_at: new Date().toISOString(),
        })
        .eq('id', bet.id);

      // Update user balance
      if (isWin) {
        const winnings = Math.round(bet.stake * bet.odds_at_placement);
        const { data: user } = await supabase
          .from('users')
          .select('balance, total_won, win_streak, biggest_win')
          .eq('id', bet.user_id)
          .single();

        if (user) {
          const newBalance = user.balance + winnings;
          const newBiggestWin = Math.max(user.biggest_win || 0, winnings);

          await supabase
            .from('users')
            .update({
              balance: newBalance,
              total_won: (user.total_won || 0) + 1,
              win_streak: (user.win_streak || 0) + 1,
              biggest_win: newBiggestWin,
            })
            .eq('id', bet.user_id);

          // Log transaction
          await supabase.from('transactions').insert({
            user_id: bet.user_id,
            type: 'win',
            amount: winnings,
            balance_after: newBalance,
            description: `Won ₹${winnings} on ${bet.market_name} — ${bet.selection}`,
          });
        }
      } else {
        // Loss — update stats
        const { data: user } = await supabase
          .from('users')
          .select('balance, total_lost, win_streak')
          .eq('id', bet.user_id)
          .single();

        if (user) {
          await supabase
            .from('users')
            .update({
              total_lost: (user.total_lost || 0) + 1,
              win_streak: 0,
            })
            .eq('id', bet.user_id);

          // Log transaction
          await supabase.from('transactions').insert({
            user_id: bet.user_id,
            type: 'loss',
            amount: -bet.stake,
            balance_after: user.balance,
            description: `Lost ₹${bet.stake} on ${bet.market_name} — ${bet.selection}`,
          });
        }
      }
    }

    console.log(`✅ Settled ${pendingBets.length} bets for market ${marketId}`);
  } catch (err) {
    console.error(`❌ Bet settlement error for ${marketId}:`, err.message);
  }
}

module.exports = { settleBets };
