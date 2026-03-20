// ═══════════════════════════════════════════════════════════
// store/useUserStore.js — User session, balance, stats
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────
      username: '',
      balance: 0,
      previousBalance: 0,
      isLoggedIn: false,
      stats: {
        totalBets: 0,
        totalWon: 0,
        totalLost: 0,
        winStreak: 0,
        biggestWin: 0,
        winRate: 0,
        roi: 0,
      },

      // ── Actions ──────────────────────────────────────────

      /**
       * Set user on login/register
       * @param {string} username
       * @param {number} balance
       * @param {string} userId
       */
      setUser: (username, balance, userId = null) => {
        set({
          username,
          balance,
          previousBalance: balance,
          isLoggedIn: true,
          userId,
        });
        if (username) localStorage.setItem('ipl_username', username);
        if (userId)   localStorage.setItem('ipl_userId', userId);
      },

      /**
       * Update balance with animation tracking via previousBalance
       */
      updateBalance: (newBalance) => {
        set((state) => ({
          previousBalance: state.balance,
          balance: newBalance,
        }));
      },

      /**
       * Set user stats from server
       */
      setStats: (stats) => {
        set({ stats: { ...get().stats, ...stats } });
      },

      /**
       * Logout — clear session
       */
      logout: () => {
        localStorage.removeItem('ipl_username');
        localStorage.removeItem('ipl_userId');
        set({
          username: '',
          balance: 0,
          previousBalance: 0,
          isLoggedIn: false,
          userId: null,
          stats: {
            totalBets: 0,
            totalWon: 0,
            totalLost: 0,
            winStreak: 0,
            biggestWin: 0,
            winRate: 0,
            roi: 0,
          },
        });
      },
    }),
    {
      name: 'ipl-user-store',
      // Only persist these fields — don't persist previousBalance
      partialize: (state) => ({
        username: state.username,
        balance: state.balance,
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        stats: state.stats,
      }),
    }
  )
);

export default useUserStore;
