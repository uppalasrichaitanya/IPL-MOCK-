// ═══════════════════════════════════════════════════════════
// components/LossAnimation.jsx — Subtle loss feedback
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useToastStore from '../hooks/useToast';

/**
 * LossAnimation — triggered when a bet settles as "lost"
 * Subtle: red edge flash + balance shake. Auto-dismiss 400ms.
 *
 * Props:
 *   visible    {boolean}
 *   onDismiss  {() => void}
 */
export default function LossAnimation({ visible = false, onDismiss }) {
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!visible) return;
    addToast('error', 'Better luck next time! 💪', 'Your bet did not win.');

    const timer = setTimeout(() => onDismiss?.(), 600);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, addToast]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loss-flash"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 0] }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9090,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 80px rgba(255,69,96,0.4)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * useBalanceShake — returns Framer Motion animate props
 * Call shakeBalance() to trigger the x-axis shake.
 */
export function useBalanceShake() {
  const [shaking, setShaking] = useState(false);

  const shakeBalance = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const shakeProps = shaking
    ? { animate: { x: [-10, 10, -10, 10, 0] }, transition: { duration: 0.4 } }
    : {};

  return { shakeBalance, shakeProps, shaking };
}
