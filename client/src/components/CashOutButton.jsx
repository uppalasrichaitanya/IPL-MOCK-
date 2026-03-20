// ═══════════════════════════════════════════════════════════
// components/CashOutButton.jsx — Live cash out with value
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Loader2 } from 'lucide-react';
import { useCashOut } from '../hooks/useCashOut';
import useUserStore from '../store/useUserStore';
import useToastStore from '../hooks/useToast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * CashOutButton — live cash-out value for an active bet
 *
 * Props:
 *   betId       {string}
 *   stake       {number}
 *   originalOdds {number}
 *   currentOdds  {number}
 *   onCashedOut  {() => void}
 */
export default function CashOutButton({
  betId,
  stake,
  originalOdds,
  currentOdds,
  onCashedOut,
}) {
  const { cashOutValue, profit, status } = useCashOut(stake, originalOdds, currentOdds);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);

  const { updateBalance, userId } = useUserStore();
  const addToast                  = useToastStore((s) => s.addToast);

  // Colour by status
  const btnBg =
    status === 'profit'  ? 'linear-gradient(135deg, #00E676, #00C853)' :
    status === 'partial' ? 'linear-gradient(135deg, #FFD700, #FFA000)' :
                           '#2A2A42';
  const btnColor = status === 'loss' ? '#8888AA' : '#080810';

  const handleCashOut = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/bets/cashout/${betId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cashOutValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', 'Cash out failed', data.error || 'Try again.');
        return;
      }

      updateBalance(data.newBalance);
      addToast('success', `Cashed out for ₹${cashOutValue.toLocaleString('en-IN')}! 💰`,
        profit >= 0 ? `You made ₹${profit.toLocaleString('en-IN')} profit` : `Recovered ₹${cashOutValue.toLocaleString('en-IN')}`);
      onCashedOut?.();
    } catch {
      addToast('error', 'Network error', 'Could not cash out.');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setShowConfirm(true)}
        style={{
          background: btnBg,
          border: 'none',
          borderRadius: 10,
          padding: '8px 14px',
          color: btnColor,
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <DollarSign size={12} />
        Cash Out ₹{cashOutValue.toLocaleString('en-IN')}
      </motion.button>

      {/* Inline confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            style={{
              position: 'absolute', bottom: '110%', right: 0,
              background: '#1A1A2E', border: '1px solid #2A2A42',
              borderRadius: 14, padding: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 220, zIndex: 20,
            }}
          >
            <p style={{ margin: '0 0 6px', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>
              Cash out for ₹{cashOutValue.toLocaleString('en-IN')}?
            </p>
            <p style={{ margin: '0 0 12px', color: '#8888AA', fontSize: 11 }}>
              {profit >= 0
                ? `Profit: +₹${profit.toLocaleString('en-IN')}`
                : `Loss: -₹${Math.abs(profit).toLocaleString('en-IN')}`}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: '8px 0',
                  background: '#10101E', border: '1px solid #2A2A42',
                  borderRadius: 8, color: '#8888AA', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCashOut}
                disabled={loading}
                style={{
                  flex: 1, padding: '8px 0',
                  background: loading ? '#3A3A5C' : '#00E676',
                  border: 'none', borderRadius: 8,
                  color: '#080810', fontSize: 12, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
