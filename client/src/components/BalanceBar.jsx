// ═══════════════════════════════════════════════════════════
// components/BalanceBar.jsx — Animated coin balance display
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * Animated numeric counter using Framer Motion spring
 */
function AnimatedNumber({ value, duration = 0.6 }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20, duration });
  const display = useTransform(spring, (v) =>
    Math.round(v).toLocaleString('en-IN')
  );

  // keep spring in sync
  useEffect(() => { spring.set(value); }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

/**
 * BalanceBar — shows coin balance with animated count + glow flash
 *
 * Props:
 *   balance          {number}
 *   previousBalance  {number}
 *   compact          {boolean} — smaller variant for mobile nav
 */
export default function BalanceBar({ balance = 0, previousBalance = 0, compact = false }) {
  const [glowColor, setGlowColor] = useState(null);
  const prevRef = useRef(previousBalance);

  useEffect(() => {
    if (balance === prevRef.current) return;
    const increased = balance > prevRef.current;
    setGlowColor(increased ? '#00E676' : '#FF4560');
    prevRef.current = balance;

    const t = setTimeout(() => setGlowColor(null), 1200);
    return () => clearTimeout(t);
  }, [balance]);

  const textColor = glowColor ?? '#FFFFFF';

  return (
    <motion.div
      animate={{
        boxShadow: glowColor ? `0 0 16px ${glowColor}55` : '0 0 0px transparent',
      }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        background: '#1A1A2E',
        border: '1px solid #2A2A42',
        borderRadius: compact ? 20 : 24,
        padding: compact ? '4px 10px' : '6px 14px',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: compact ? 14 : 16 }}>🪙</span>
      <motion.span
        animate={{ color: textColor }}
        transition={{ duration: 0.2 }}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          fontSize: compact ? 13 : 15,
          letterSpacing: '-0.02em',
        }}
      >
        ₹<AnimatedNumber value={balance} />
      </motion.span>
    </motion.div>
  );
}
