// ═══════════════════════════════════════════════════════════
// store/useMatchStore.js — Live scores, odds, match state
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';

const useMatchStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  currentMatch: null,    // The active/selected match object
  scoreData: null,       // Full parsed score payload from socket
  allOdds: [],           // Array of all market odds objects
  isLive: false,         // Whether there is a live match in progress
  isScoreDelayed: false, // True when ESPN fails and shows "Score delayed"
  lastUpdated: null,     // ISO timestamp of last score_update received

  // ── Actions ────────────────────────────────────────────

  /**
   * Update live score data.
   * Called on socket "score_update" event.
   * Picks the first live match as currentMatch.
   */
  setScore: (scoreData) => {
    const liveMatch = scoreData?.matches?.find((m) => m.isLive) || null;
    set({
      scoreData,
      currentMatch: liveMatch,
      lastUpdated: new Date().toISOString(),
    });
  },

  /**
   * Update all live odds.
   * Called on socket "odds_update" event.
   * @param {Object} oddsPayload — { markets: [], timestamp }
   */
  setOdds: (oddsPayload) => {
    set({ allOdds: oddsPayload?.markets || [] });
  },

  /**
   * Set the score-delayed status flag.
   * Shows "Score temporarily delayed" badge in UI when true.
   */
  setDelayed: (isDelayed) => {
    set({ isScoreDelayed: isDelayed });
  },

  /**
   * Set whether a live match is active.
   */
  setLive: (isLive) => {
    set({ isLive });
  },

  /**
   * Manually select a match (e.g. from match lobby).
   */
  selectMatch: (match) => {
    set({ currentMatch: match });
  },

  /**
   * Get all odds for a specific market.
   * @param {string} marketId
   * @returns {Array}
   */
  getMarketOdds: (marketId) => {
    return get().allOdds.filter((m) => m.marketId === marketId);
  },
}));

export default useMatchStore;
