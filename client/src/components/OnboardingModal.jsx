// ═══════════════════════════════════════════════════════════
// components/OnboardingModal.jsx — First-visit signup modal
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import useUserStore from '../store/useUserStore';
import useToastStore from '../hooks/useToast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function OnboardingModal({ visible, onClose }) {
  const [username, setUsername]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { setUser }               = useUserStore();
  const addToast                  = useToastStore((s) => s.addToast);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const clean = username.trim().toLowerCase().replace(/\s+/g, '');
    if (clean.length < 3)  { setError('Username must be at least 3 characters.'); return; }
    if (clean.length > 20) { setError('Username must be 20 characters or less.'); return; }
    if (!/^[a-z0-9_]+$/.test(clean)) { setError('Only letters, numbers, and underscores allowed.'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Username unavailable. Try another one.');
        return;
      }

      const { user } = data;
      setUser(user.username, user.balance, user.id);
      addToast('success', `Welcome, ${user.username}! 🏏`, 'You have ₹10,000 to start betting!');
      onClose?.();
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9050,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            key="onboarding-card"
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{   opacity: 0, scale: 0.88, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 440,
              padding: 1,
              background: 'linear-gradient(135deg, #6C63FF, #00D4FF)',
              borderRadius: 20,
            }}
          >
            <div
              style={{
                background: '#1A1A2E',
                borderRadius: 19,
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  style={{ display: 'inline-block', marginBottom: 12 }}
                >
                  <svg viewBox="0 0 24 24" width="64" height="64">
                    <circle cx="6" cy="18" r="2.5" fill="#FFD700" />
                    <g transform="rotate(45 12 12)">
                      <rect x="11" y="2" width="2" height="6" rx="0.5" fill="#8888AA" />
                      <path d="M 11 8 L 9 9.5 L 9 20 C 9 21.5 15 21.5 15 20 L 15 9.5 L 13 8 Z" fill="#6C63FF" />
                      <line x1="12" y1="9" x2="12" y2="20.5" stroke="#1A1A2E" strokeWidth="0.5" />
                    </g>
                  </svg>
                </motion.div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
                  Welcome to IPL Bet!
                </h1>
                <p style={{ margin: '6px 0 0', color: '#8888AA', fontSize: 14 }}>
                  The ultimate free IPL betting game
                </p>
              </div>

              {/* Feature pills */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['🪙 ₹10,000 Free', '📺 Live Scores', '🏆 Leaderboard'].map((f) => (
                  <span
                    key={f}
                    style={{
                      background: '#10101E',
                      border: '1px solid #2A2A42',
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: 12,
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #2A2A42' }} />

              {/* Username form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                  Choose your username
                </label>
                <input
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  maxLength={20}
                  placeholder="Enter username..."
                  disabled={loading}
                  style={{
                    background: '#10101E',
                    border: `1px solid ${error ? '#FF4560' : '#2A2A42'}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: '#FFFFFF',
                    fontSize: 15,
                    outline: 'none',
                    width: '100%',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'border-color 200ms',
                  }}
                  onFocus={(e) => { if (!error) e.target.style.borderColor = '#6C63FF'; }}
                  onBlur={(e)  => { if (!error) e.target.style.borderColor = '#2A2A42'; }}
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ margin: 0, color: '#FF4560', fontSize: 12 }}
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: loading ? '#3A3A5C' : '#6C63FF',
                    border: 'none',
                    borderRadius: 12,
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontFamily: 'Inter, sans-serif',
                    transition: 'background 200ms',
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Creating account...' : 'Start Playing →'}
                </motion.button>
              </form>

              <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: '#8888AA' }}>
                100% free • No real money • Just for fun
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
