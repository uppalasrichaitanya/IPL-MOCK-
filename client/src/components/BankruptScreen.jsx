// ═══════════════════════════════════════════════════════════
// components/BankruptScreen.jsx — Balance < ₹50 recovery screen
// ═══════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import useUserStore from '../store/useUserStore';
import useToastStore from '../hooks/useToast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function BankruptScreen({ balance }) {
  const [loading, setLoading]   = useState(false);
  const { updateBalance, userId } = useUserStore();
  const addToast                = useToastStore((s) => s.addToast);

  const handleReset = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND}/api/auth/reset-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', 'Reset failed', data.error || 'Please try again.');
        return;
      }
      updateBalance(2000);
      addToast('success', '₹2,000 coins added! 💰', 'Welcome back — make it count!');
    } catch {
      addToast('error', 'Network error', 'Could not reset balance. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9040,
        background: 'rgba(8,8,16,0.96)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{
          background: '#10101E',
          border: '1px solid #2A2A42',
          borderRadius: 24,
          padding: '48px 36px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Emoji */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          style={{ fontSize: 72, lineHeight: 1 }}
        >
          😅
        </motion.div>

        {/* Heading */}
        <div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#FFFFFF' }}>
            You&apos;re out of coins!
          </h2>
          <p style={{ margin: '8px 0 0', color: '#8888AA', fontSize: 14 }}>
            Don&apos;t worry, it happens to everyone
          </p>
        </div>

        {/* Current balance */}
        <div
          style={{
            background: '#1A1A2E',
            border: '1px solid #2A2A42',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'inline-block',
          }}
        >
          <span style={{ color: '#8888AA', fontSize: 13 }}>Balance: </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: '#FF4560',
              fontSize: 16,
            }}
          >
            ₹{balance?.toLocaleString('en-IN') || 0}
          </span>
        </div>

        <div style={{ borderTop: '1px solid #2A2A42' }} />

        {/* Reset button */}
        <motion.button
          whileHover={{
            scale: 1.04,
            boxShadow: '0 0 24px rgba(108,99,255,0.5)',
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleReset}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#3A3A5C' : 'linear-gradient(135deg, #6C63FF, #00D4FF)',
            border: 'none',
            borderRadius: 14,
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : '💰'}
          {loading ? 'Adding coins...' : 'Get ₹2,000 Free Coins'}
        </motion.button>

        <p style={{ margin: 0, color: '#8888AA', fontSize: 13 }}>
          Every legend has a comeback story 🏏
        </p>
      </motion.div>
    </motion.div>
  );
}
