// ═══════════════════════════════════════════════════════════
// hooks/useLiveScore.js — Socket.io live score listener
// Connects to backend, handles score_update + odds_update,
// auto-reconnects, and detects stale data (score delayed)
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useMatchStore from '../store/useMatchStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const STALE_THRESHOLD_MS = 30_000; // 30 seconds without update = delayed

// Singleton socket — shared across all components that call this hook
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/**
 * useLiveScore — connect to Socket.io and populate match store.
 *
 * Returns { isConnected, lastUpdate }
 */
export function useLiveScore() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const { setScore, setOdds, setDelayed, setLive } = useMatchStore();

  // Stale data timer ref
  const staleTimer = useRef(null);

  const resetStaleTimer = useCallback(() => {
    if (staleTimer.current) clearTimeout(staleTimer.current);
    setDelayed(false);
    staleTimer.current = setTimeout(() => {
      setDelayed(true);
    }, STALE_THRESHOLD_MS);
  }, [setDelayed]);

  useEffect(() => {
    const sock = getSocket();

    // ── Connection events ─────────────────────────────────
    sock.on('connect', () => {
      setIsConnected(true);
      setDelayed(false);
      resetStaleTimer();
      console.log('🔌 Socket connected:', sock.id);
    });

    sock.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected');
    });

    sock.on('connect_error', (err) => {
      setIsConnected(false);
      console.warn('⚠️  Socket connection error:', err.message);
    });

    // ── Score updates (every 10s from backend) ────────────
    sock.on('score_update', (data) => {
      setScore(data);
      setLastUpdate(new Date().toISOString());
      resetStaleTimer();

      const hasLive = data?.matches?.some((m) => m.isLive) || false;
      setLive(hasLive);

      // Propagate backend's delay flag
      if (data?.isDelayed) {
        setDelayed(true);
      }
    });

    // ── Odds updates (every 15s from backend) ─────────────
    sock.on('odds_update', (data) => {
      setOdds(data);
    });

    // Cleanup on unmount
    return () => {
      sock.off('connect');
      sock.off('disconnect');
      sock.off('connect_error');
      sock.off('score_update');
      sock.off('odds_update');
      if (staleTimer.current) clearTimeout(staleTimer.current);
    };
  }, [setScore, setOdds, setDelayed, setLive, resetStaleTimer]);

  return { isConnected, lastUpdate };
}

export default useLiveScore;
