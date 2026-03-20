// ═══════════════════════════════════════════════════════════
// hooks/useOdds.js — Odds with movement tracking + alerts
// Reads allOdds from useMatchStore, tracks previous values,
// returns per-market odds with movement flag.
// Fires toast alerts when odds on active bets shift > 0.3.
// ═══════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect } from 'react';
import useMatchStore from '../store/useMatchStore';
import useBetStore from '../store/useBetStore';
import useToastStore from '../hooks/useToast';

/**
 * useOdds — returns odds helpers with movement tracking and active bet alerts.
 */
export function useOdds() {
  const allOdds    = useMatchStore((s) => s.allOdds);
  const activeBets = useBetStore((s) => s.activeBets);
  const addToast   = useToastStore((s) => s.addToast);

  // Track previous odds values: { "marketId_selection": odds }
  const previousOddsRef = useRef({});
  const alertedRef      = useRef({}); // Prevent spamming same alert

  // Build enriched odds with client-side movement tracking
  const enrichedOdds = Array.isArray(allOdds)
    ? allOdds.map((market) => {
        const key = `${market.marketId}_${market.selection}`;
        const prev = previousOddsRef.current[key];

        let movement = market.movement || 'same';
        if (prev !== undefined && prev !== market.odds) {
          movement = market.odds > prev ? 'up' : 'down';
        }

        previousOddsRef.current[key] = market.odds;
        return { ...market, clientMovement: movement };
      })
    : [];

  // ── Odds movement alerts for active bets ────────────────
  useEffect(() => {
    if (!activeBets?.length || !enrichedOdds.length) return;

    for (const bet of activeBets) {
      const matching = enrichedOdds.find(
        (m) => m.marketId === bet.market_id && m.selection === bet.selection
      );
      if (!matching || !matching.odds || !bet.odds_at_placement) continue;

      const delta = Math.abs(matching.odds - bet.odds_at_placement);
      const alertKey = `${bet.id}_${matching.odds}`;

      if (delta > 0.3 && !alertedRef.current[alertKey]) {
        alertedRef.current[alertKey] = true;
        addToast(
          'warning',
          `⚡ Odds Alert: ${bet.market_name || 'Market'}`,
          `Moved to ${parseFloat(matching.odds).toFixed(2)} (was ${parseFloat(bet.odds_at_placement).toFixed(2)})`
        );
      }
    }
  }, [enrichedOdds, activeBets, addToast]);

  /**
   * Get all selections for a specific market
   */
  const getOddsForMarket = useCallback(
    (marketId) => enrichedOdds.filter((m) => m.marketId === marketId),
    [enrichedOdds]
  );

  /**
   * Get movement direction for a specific selection
   */
  const getMovement = useCallback(
    (marketId, selection) => {
      const market = enrichedOdds.find(
        (m) => m.marketId === marketId && m.selection === selection
      );
      return market?.clientMovement || 'same';
    },
    [enrichedOdds]
  );

  return {
    allMarkets: enrichedOdds,
    getOddsForMarket,
    getMovement,
  };
}

export default useOdds;
