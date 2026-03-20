// ═══════════════════════════════════════════════════════════
// hooks/useCashOut.js — Live cash out value calculator
// Formula: cashOutValue = stake × (1/currentOdds) / (1/originalOdds)
// Rounds to nearest ₹10
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';

/**
 * useCashOut — calculate the live cash out value of a bet.
 *
 * @param {number} stake           — original stake amount in coins
 * @param {number} originalOdds   — decimal odds at time of placement
 * @param {number} currentOdds    — current decimal odds for the selection
 *
 * @returns {{
 *   cashOutValue: number,    — coins to be credited (rounded to ₹10)
 *   isProfit: boolean,       — whether cash out is above stake
 *   profitLoss: number,      — delta vs original stake
 *   percentage: number,      — cash out value as % of original stake
 *   state: 'profit'|'partial'|'loss'  — for button color logic
 * }}
 */
export function useCashOut(stake, originalOdds, currentOdds) {
  return useMemo(() => {
    if (!stake || !originalOdds || !currentOdds || originalOdds <= 0 || currentOdds <= 0) {
      return {
        cashOutValue: 0,
        isProfit: false,
        profitLoss: -stake || 0,
        percentage: 0,
        state: 'loss',
      };
    }

    // Implied probabilities
    const originalProb = 1 / originalOdds;
    const currentProb  = 1 / currentOdds;

    // Core formula (matches backend betResolver.js)
    const rawValue = stake * (currentProb / originalProb);

    // Round to nearest ₹10
    const cashOutValue = Math.max(0, Math.round(rawValue / 10) * 10);

    const profitLoss = cashOutValue - stake;
    const isProfit   = profitLoss > 0;
    const percentage = stake > 0 ? parseFloat(((cashOutValue / stake) * 100).toFixed(1)) : 0;

    // Determine button state for UI coloring
    let state = 'loss';
    if (cashOutValue >= stake)         state = 'profit';
    else if (cashOutValue >= stake * 0.5) state = 'partial';

    return { cashOutValue, isProfit, profitLoss, percentage, state };
  }, [stake, originalOdds, currentOdds]);
}

export default useCashOut;
