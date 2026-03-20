// ═══════════════════════════════════════════════════════════
// store/useBetStore.js — Bet slip, active bets, history
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';

const MAX_SLIP_SELECTIONS = 5;

const useBetStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  betSlip: [],        // Array of selections (max 5)
  activeBets: [],     // Currently pending bets from DB
  betHistory: [],     // Full settled bet history
  isSlipOpen: false,  // Drawer/sidebar visibility

  // ── Actions ────────────────────────────────────────────

  /**
   * Add a selection to the bet slip.
   * Deduplicates by marketId — replaces if same market is already in slip.
   * Enforces max 5 selections for accumulator.
   * @param {Object} selection — market odds object
   */
  addToBetSlip: (selection) => {
    const { betSlip } = get();

    // Replace existing selection in the same market
    const existingIdx = betSlip.findIndex(
      (s) => s.marketId === selection.marketId
    );

    if (existingIdx !== -1) {
      const updated = [...betSlip];
      updated[existingIdx] = { ...selection, stake: updated[existingIdx].stake || 100 };
      set({ betSlip: updated, isSlipOpen: true });
      return;
    }

    // Enforce max 5
    if (betSlip.length >= MAX_SLIP_SELECTIONS) {
      console.warn('Bet slip is full (max 5 selections)');
      return;
    }

    set({
      betSlip: [...betSlip, { ...selection, stake: 100 }],
      isSlipOpen: true,
    });
  },

  /**
   * Update the stake on a specific slip item.
   * @param {string} marketId
   * @param {number} stake
   */
  updateStake: (marketId, stake) => {
    set((state) => ({
      betSlip: state.betSlip.map((s) =>
        s.marketId === marketId ? { ...s, stake } : s
      ),
    }));
  },

  /**
   * Remove a selection from the bet slip.
   * @param {string} marketId
   */
  removeFromSlip: (marketId) => {
    set((state) => ({
      betSlip: state.betSlip.filter((s) => s.marketId !== marketId),
    }));
  },

  /**
   * Clear the entire bet slip.
   */
  clearSlip: () => {
    set({ betSlip: [] });
  },

  /**
   * Set active (pending) bets from API.
   */
  setActiveBets: (bets) => {
    set({ activeBets: bets });
  },

  /**
   * Set bet history from API.
   */
  setBetHistory: (history) => {
    set({ betHistory: history });
  },

  /**
   * Open the bet slip panel.
   */
  openSlip: () => set({ isSlipOpen: true }),

  /**
   * Close the bet slip panel.
   */
  closeSlip: () => set({ isSlipOpen: false }),

  /**
   * Get total combined odds for accumulator display.
   */
  getCombinedOdds: () => {
    const { betSlip } = get();
    if (betSlip.length === 0) return 1;
    return parseFloat(
      betSlip.reduce((acc, s) => acc * (s.odds || 1), 1).toFixed(2)
    );
  },

  /**
   * Get total stake across all slip items.
   */
  getTotalStake: () => {
    return get().betSlip.reduce((sum, s) => sum + (s.stake || 0), 0);
  },

  /**
   * Get potential return for the full accumulator.
   */
  getAccumulatorReturn: () => {
    const { getCombinedOdds, getTotalStake } = get();
    return Math.round(getTotalStake() * getCombinedOdds());
  },
}));

export default useBetStore;
