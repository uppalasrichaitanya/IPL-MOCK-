// ═══════════════════════════════════════════════════════════
// hooks/useToast.js — Zustand toast store
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';

const MAX_TOASTS = 3;
const AUTO_REMOVE_MS = 4000;

const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Add a new toast. Auto-removes after 4s. Max 3 visible.
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {string} title
   * @param {string} message
   */
  addToast: (type, title, message = '') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toast = { id, type, title, message, createdAt: Date.now() };

    set((state) => {
      const current = state.toasts;
      // Drop oldest if at max
      const trimmed = current.length >= MAX_TOASTS
        ? current.slice(-(MAX_TOASTS - 1))
        : current;
      return { toasts: [...trimmed, toast] };
    });

    // Auto-remove after 4s
    setTimeout(() => {
      get().removeToast(id);
    }, AUTO_REMOVE_MS);
  },

  /** Remove a toast by id */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export default useToastStore;
