// ═══════════════════════════════════════════════════════════
// components/ActiveBets.jsx — Panel showing pending bets
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import useBetStore from '../store/useBetStore';
import useUserStore from '../store/useUserStore';
import useMatchStore from '../store/useMatchStore';
import CashOutButton from './CashOutButton';
import useToastStore from '../hooks/useToast';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function ActiveBets() {
  const activeBets   = useBetStore((s) => s.activeBets);
  const setActiveBets = useBetStore((s) => s.setActiveBets);
  const { userId }   = useUserStore();
  const allOdds      = useMatchStore((s) => s.allOdds);
  const addToast     = useToastStore((s) => s.addToast);

  // Fetch active bets on mount + poll every 30s
  useEffect(() => {
    if (!userId) return;
    const fetchBets = async () => {
      try {
        const res  = await fetch(`${BACKEND}/api/bets/active?userId=${userId}`);
        const data = await res.json();
        if (res.ok) setActiveBets(data.bets || []);
      } catch { /* silent */ }
    };
    fetchBets();
    const interval = setInterval(fetchBets, 30000);
    return () => clearInterval(interval);
  }, [userId, setActiveBets]);

  // Get current odds for a market
  const getCurrentOdds = (marketId, selection) => {
    const marketOdds = allOdds?.[marketId];
    if (!marketOdds) return null;
    const sel = marketOdds.find?.((s) => s.label === selection);
    return sel?.odds || null;
  };

  const handleCashedOut = (betId) => {
    setActiveBets(activeBets.filter((b) => b.id !== betId));
  };

  if (!activeBets || activeBets.length === 0) {
    return (
      <div
        style={{
          background: '#10101E', border: '1px solid #2A2A42',
          borderRadius: 16, padding: '24px 16px', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <p style={{ margin: 0, color: '#8888AA', fontSize: 13 }}>No active bets</p>
        <p style={{ margin: '4px 0 0', color: '#555', fontSize: 11 }}>
          Place a bet to see it here
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 3, height: 18, background: '#00D4FF', borderRadius: 2 }} />
        <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: 14 }}>
          Active Bets ({activeBets.length})
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {activeBets.map((bet) => {
          const currentOdds = getCurrentOdds(bet.market_id, bet.selection);

          return (
            <motion.div
              key={bet.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40 }}
              style={{
                background: '#10101E',
                border: '1px solid #2A2A42',
                borderRadius: 14,
                padding: 14,
                display: 'flex', flexDirection: 'column', gap: 8,
                position: 'relative',
              }}
            >
              {/* Pending pulse */}
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00D4FF', display: 'inline-block',
                }} />
                <span style={{ color: '#00D4FF', fontSize: 10, fontWeight: 600 }}>Pending</span>
              </motion.div>

              {/* Market + selection */}
              <div>
                <div style={{ color: '#8888AA', fontSize: 11 }}>{bet.market_name || 'Market'}</div>
                <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13, marginTop: 2 }}>{bet.selection}</div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <StatItem label="Stake" value={`₹${(bet.stake || 0).toLocaleString('en-IN')}`} />
                <StatItem label="Odds" value={parseFloat(bet.odds_at_placement || 0).toFixed(2)} mono />
                <StatItem label="Potential" value={`₹${(bet.potential_return || 0).toLocaleString('en-IN')}`} highlight />
                {currentOdds && (
                  <StatItem label="Current" value={parseFloat(currentOdds).toFixed(2)} mono />
                )}
              </div>

              {/* Cash out */}
              {currentOdds && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <CashOutButton
                    betId={bet.id}
                    stake={bet.stake}
                    originalOdds={bet.odds_at_placement}
                    currentOdds={currentOdds}
                    onCashedOut={() => handleCashedOut(bet.id)}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function StatItem({ label, value, mono = false, highlight = false }) {
  return (
    <div>
      <div style={{ color: '#8888AA', fontSize: 10 }}>{label}</div>
      <div
        style={{
          fontFamily: mono || highlight ? "'JetBrains Mono', monospace" : 'Inter, sans-serif',
          fontWeight: highlight ? 700 : 600,
          fontSize: 13,
          color: highlight ? '#00E676' : '#FFFFFF',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
