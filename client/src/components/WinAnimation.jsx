// ═══════════════════════════════════════════════════════════
// components/WinAnimation.jsx — Full-screen win celebration
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

/**
 * WinAnimation — triggered when a bet settles as "won"
 *
 * Props:
 *   visible    {boolean}
 *   amount     {number}    — amount won (profit)
 *   matchName  {string}    — e.g. "MI vs CSK"
 *   marketName {string}    — e.g. "Match Winner"
 *   onDismiss  {() => void}
 */
export default function WinAnimation({
  visible    = false,
  amount     = 0,
  matchName  = '',
  marketName = '',
  onDismiss,
}) {
  const [displayAmount, setDisplayAmount] = useState(0);
  const timerRef = useRef(null);

  // ── Confetti burst ──────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    const colors = ['#6C63FF', '#FFD700', '#00E676', '#00D4FF'];
    const end = Date.now() + 3000;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Also a big center burst
    confetti({
      particleCount: 100,
      startVelocity: 30,
      spread: 360,
      origin: { x: 0.5, y: 0.35 },
      colors,
    });
  }, [visible]);

  // ── Count-up animation ──────────────────────────────────
  useEffect(() => {
    if (!visible) { setDisplayAmount(0); return; }
    const duration = 1500;
    const steps = 60;
    const increment = amount / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayAmount(amount);
        clearInterval(interval);
      } else {
        setDisplayAmount(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [visible, amount]);

  // ── Auto-dismiss after 4s ───────────────────────────────
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => onDismiss?.(), 4000);
    return () => clearTimeout(timerRef.current);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="win-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { clearTimeout(timerRef.current); onDismiss?.(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {/* Trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            style={{ fontSize: 96, lineHeight: 1, marginBottom: 16 }}
          >
            🏆
          </motion.div>

          {/* YOU WON! */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              margin: 0, fontSize: 48, fontWeight: 800,
              color: '#FFD700', letterSpacing: 2,
              textShadow: '0 0 40px rgba(255,215,0,0.4)',
            }}
          >
            YOU WON!
          </motion.h1>

          {/* Amount with count-up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 40, fontWeight: 700,
              color: '#00E676', marginTop: 12,
            }}
          >
            +₹{displayAmount.toLocaleString('en-IN')}
          </motion.div>

          {/* Match + market */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ margin: '16px 0 0', color: '#8888AA', fontSize: 14, textAlign: 'center' }}
          >
            {matchName && <span>{matchName}<br /></span>}
            {marketName}
          </motion.p>

          {/* Tap hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5, 1] }}
            transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
            style={{ marginTop: 32, color: '#555', fontSize: 11 }}
          >
            Tap anywhere to dismiss
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
