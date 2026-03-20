// ═══════════════════════════════════════════════════════════
// components/OddsCard.jsx — Market odds card with selections
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock } from 'lucide-react';
import useBetStore from '../store/useBetStore';
import useToastStore from '../hooks/useToast';

/**
 * OddsCard — one betting market card.
 *
 * Props:
 *   marketId    {string}   — unique market identifier
 *   marketName  {string}   — display name, e.g. "Match Winner"
 *   selections  {Array}    — [{ id, label, odds, movement }]
 *   lockTime    {number|null} — seconds until market locks (null = not closing)
 *   isLocked    {boolean}  — market already closed / suspended
 *   matchId     {string}   — parent match id
 *   loading     {boolean}  — show skeleton
 */
export default function OddsCard({
  marketId     = '',
  marketName   = 'Market',
  selections   = [],
  lockTime     = null,
  isLocked     = false,
  matchId      = '',
  loading      = false,
}) {
  const addToBetSlip = useBetStore((s) => s.addToBetSlip);
  const betSlip      = useBetStore((s) => s.betSlip);
  const addToast     = useToastStore((s) => s.addToast);

  // ── Skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          background: '#10101E',
          border: '1px solid #2A2A42',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            width: '50%', height: 12, borderRadius: 6,
            background: 'linear-gradient(90deg,#1A1A2E 25%,#2A2A42 50%,#1A1A2E 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 48, borderRadius: 10,
                background: 'linear-gradient(90deg,#1A1A2E 25%,#2A2A42 50%,#1A1A2E 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Closing-soon banner ────────────────────────────────────
  const isClosingSoon = lockTime !== null && lockTime > 0 && lockTime <= 30;

  // ── Handler ────────────────────────────────────────────────
  const handleSelect = (sel) => {
    if (isLocked) return;
    if (betSlip.length >= 5 && !betSlip.find((s) => s.marketId === marketId)) {
      addToast('warning', 'Bet slip full', 'Max 5 selections allowed.');
      return;
    }
    addToBetSlip({
      marketId,
      selection: sel.label,
      odds: sel.odds,
      matchId,
      marketName,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#10101E',
        border: `1px solid ${isClosingSoon ? '#FFD70066' : '#2A2A42'}`,
        borderRadius: 16,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
        opacity: isLocked ? 0.55 : 1,
        transition: 'border-color 300ms, opacity 300ms',
      }}
    >
      {/* Lock overlay */}
      {isLocked && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(8,8,16,0.65)', borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8888AA', fontSize: 13 }}>
            <Lock size={14} /> Market Locked
          </div>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13 }}>
          {marketName}
        </span>

        {/* Closing countdown */}
        {isClosingSoon && !isLocked && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: '#FFD700', fontSize: 11, fontWeight: 600,
              background: 'rgba(255,215,0,0.1)',
              padding: '2px 8px', borderRadius: 8,
            }}
          >
            <Clock size={11} /> Closing in {lockTime}s
          </motion.span>
        )}
      </div>

      {/* Selection buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {selections.map((sel) => (
          <OddsButton
            key={sel.id || sel.label}
            sel={sel}
            isLocked={isLocked}
            isSelected={betSlip.some((s) => s.marketId === marketId && s.selection === sel.label)}
            onClick={() => handleSelect(sel)}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * OddsButton — individual selection button inside an OddsCard
 */
function OddsButton({ sel, isLocked, isSelected, onClick }) {
  const [flash, setFlash] = useState(null); // 'up' | 'down' | null
  const prevOdds = useRef(sel.odds);

  useEffect(() => {
    if (sel.odds !== prevOdds.current) {
      setFlash(sel.odds > prevOdds.current ? 'up' : 'down');
      prevOdds.current = sel.odds;
      const t = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(t);
    }
  }, [sel.odds]);

  const flashBg =
    flash === 'up'   ? 'rgba(0,230,118,0.2)' :
    flash === 'down' ? 'rgba(255,69,96,0.2)' : 'transparent';

  const movement = sel.movement || flash;

  return (
    <motion.button
      whileHover={!isLocked ? { background: 'rgba(108,99,255,0.18)' } : {}}
      whileTap={!isLocked ? { scale: 0.96 } : {}}
      onClick={onClick}
      disabled={isLocked}
      animate={{ backgroundColor: flashBg }}
      transition={{ duration: 0.3 }}
      style={{
        flex: 1,
        background: isSelected ? 'rgba(108,99,255,0.2)' : '#1A1A2E',
        border: `1px solid ${isSelected ? '#6C63FF' : '#2A2A42'}`,
        borderRadius: 10,
        padding: '10px 8px',
        minHeight: 44,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 200ms',
      }}
    >
      <div style={{ color: '#8888AA', fontSize: 11, marginBottom: 4 }}>{sel.label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 15,
            color: isSelected ? '#6C63FF' : '#FFFFFF',
          }}
        >
          {sel.odds ? parseFloat(sel.odds).toFixed(2) : '—'}
        </span>
        {/* Movement arrow */}
        {movement && (
          <motion.span
            initial={{ opacity: 0, y: movement === 'up' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 10,
              color: movement === 'up' ? '#00E676' : '#FF4560',
            }}
          >
            {movement === 'up' ? '▲' : '▼'}
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}
