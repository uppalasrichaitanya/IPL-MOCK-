// ═══════════════════════════════════════════════════════════
// components/BetSlip.jsx — Desktop sidebar + mobile drawer
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronUp, ShoppingCart } from 'lucide-react';
import useBetStore from '../store/useBetStore';
import useUserStore from '../store/useUserStore';
import useToastStore from '../hooks/useToast';
import ConfirmBetModal from './ConfirmBetModal';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const QUICK_STAKES = [
  { label: '₹100',  value: 100 },
  { label: '₹500',  value: 500 },
  { label: '₹1K',   value: 1000 },
  { label: '₹5K',   value: 5000 },
  { label: 'All In', value: 'all' },
];

// ── Single slip item ──────────────────────────────────────
function SlipItem({ item, balance }) {
  const updateStake      = useBetStore((s) => s.updateStake);
  const removeFromSlip   = useBetStore((s) => s.removeFromSlip);

  const handleStake = (val) => {
    if (val === 'all') {
      updateStake(item.marketId, balance);
    } else {
      updateStake(item.marketId, Math.min(val, balance));
    }
  };

  const potReturn = Math.round((item.stake || 0) * (item.odds || 1));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        background: '#10101E',
        border: '1px solid #2A2A42',
        borderRadius: 14,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      {/* Top row: market + remove */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#8888AA', fontSize: 11 }}>{item.marketName || 'Market'}</div>
          <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13, marginTop: 2 }}>{item.selection}</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => removeFromSlip(item.marketId)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888AA', padding: 2 }}
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Odds */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8888AA', fontSize: 11 }}>Odds</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#6C63FF', fontSize: 14 }}>
          {item.odds ? parseFloat(item.odds).toFixed(2) : '—'}
        </span>
      </div>

      {/* Stake input */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#8888AA', fontSize: 11, whiteSpace: 'nowrap' }}>Stake</span>
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: '#1A1A2E', border: '1px solid #2A2A42',
              borderRadius: 10, padding: '4px 10px',
            }}
          >
            <span style={{ color: '#8888AA', fontSize: 13, marginRight: 2 }}>₹</span>
            <input
              type="number"
              min={50}
              max={balance}
              value={item.stake || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                updateStake(item.marketId, Math.max(0, Math.min(v, balance)));
              }}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#FFFFFF', width: '100%',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600,
              }}
            />
          </div>
        </div>

        {/* Stake slider */}
        <input
          type="range"
          min={50}
          max={balance || 10000}
          value={item.stake || 50}
          onChange={(e) => updateStake(item.marketId, parseInt(e.target.value))}
          style={{
            width: '100%', marginTop: 6,
            accentColor: '#6C63FF', height: 4,
          }}
        />

        {/* Quick stake buttons */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {QUICK_STAKES.map((qs) => (
            <motion.button
              key={qs.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleStake(qs.value)}
              style={{
                flex: 1, padding: '4px 0',
                background: (qs.value !== 'all' && item.stake === qs.value) ? 'rgba(108,99,255,0.25)' : '#1A1A2E',
                border: '1px solid #2A2A42',
                borderRadius: 6,
                color: '#8888AA', fontSize: 10, fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {qs.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Potential return */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid #2A2A42', paddingTop: 8,
        }}
      >
        <span style={{ color: '#8888AA', fontSize: 11 }}>Potential Return</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#00E676', fontSize: 14 }}>
          ₹{potReturn.toLocaleString('en-IN')}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main BetSlip ────────────────────────────────────────────
export default function BetSlip({ isMobile = false }) {
  const betSlip     = useBetStore((s) => s.betSlip);
  const isSlipOpen  = useBetStore((s) => s.isSlipOpen);
  const openSlip    = useBetStore((s) => s.openSlip);
  const closeSlip   = useBetStore((s) => s.closeSlip);
  const clearSlip   = useBetStore((s) => s.clearSlip);
  const getTotalStake = useBetStore((s) => s.getTotalStake);

  const { balance, userId, updateBalance } = useUserStore();
  const addToast = useToastStore((s) => s.addToast);

  const [confirmItem, setConfirmItem] = useState(null);
  const [placing, setPlacing]         = useState(false);

  const totalStake = getTotalStake();

  // Place a single bet
  const handlePlaceBet = useCallback(async (item) => {
    setPlacing(true);
    try {
      const res = await fetch(`${BACKEND}/api/bets/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          matchId: item.matchId,
          marketId: item.marketId,
          marketName: item.marketName,
          selection: item.selection,
          odds: item.odds,
          stake: item.stake,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', 'Bet failed', data.error || 'Please try again.');
        return;
      }

      updateBalance(data.newBalance);
      useBetStore.getState().removeFromSlip(item.marketId);
      addToast('success', 'Bet placed! 🎲', `₹${item.stake} on ${item.selection} @ ${parseFloat(item.odds).toFixed(2)}`);
    } catch {
      addToast('error', 'Network error', 'Could not place bet.');
    } finally {
      setPlacing(false);
      setConfirmItem(null);
    }
  }, [userId, addToast, updateBalance]);

  // ── MOBILE DRAWER ──────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Floating button to open */}
        {betSlip.length > 0 && !isSlipOpen && (
          <motion.button
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={openSlip}
            style={{
              position: 'fixed', bottom: 50, left: '50%', transform: 'translateX(-50%)',
              zIndex: 900,
              background: '#6C63FF', border: 'none',
              borderRadius: 24, padding: '10px 22px',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#FFFFFF', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
            }}
          >
            <ShoppingCart size={16} />
            Bet Slip ({betSlip.length})
          </motion.button>
        )}

        {/* Drawer */}
        <AnimatePresence>
          {isSlipOpen && (
            <motion.div
              key="mobile-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                zIndex: 950,
                maxHeight: '85vh', overflowY: 'auto',
                background: '#10101E',
                borderTop: '2px solid #6C63FF',
                borderRadius: '20px 20px 0 0',
                padding: '16px 16px 60px',
              }}
            >
              {/* Drag handle + header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: 16 }}>
                  Bet Slip ({betSlip.length})
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {betSlip.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={clearSlip}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4560', padding: 4 }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={closeSlip}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888AA', padding: 4 }}
                  >
                    <ChevronUp size={20} style={{ transform: 'rotate(180deg)' }} />
                  </motion.button>
                </div>
              </div>

              <SlipBody
                betSlip={betSlip} balance={balance}
                onConfirm={(item) => setConfirmItem(item)}
                totalStake={totalStake}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmBetModal
          visible={!!confirmItem}
          selection={confirmItem?.selection}
          marketName={confirmItem?.marketName}
          odds={confirmItem?.odds || 0}
          stake={confirmItem?.stake || 0}
          potReturn={Math.round((confirmItem?.stake || 0) * (confirmItem?.odds || 1))}
          onConfirm={() => handlePlaceBet(confirmItem)}
          onCancel={() => setConfirmItem(null)}
          loading={placing}
        />
      </>
    );
  }

  // ── DESKTOP SIDEBAR ────────────────────────────────────────
  return (
    <div
      style={{
        background: '#10101E',
        border: '1px solid #2A2A42',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'sticky', top: 80,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid #2A2A42',
          background: 'rgba(108,99,255,0.06)',
        }}
      >
        <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: 15 }}>
          🎫 Bet Slip ({betSlip.length}/5)
        </span>
        {betSlip.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={clearSlip}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4560', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
          >
            <Trash2 size={12} /> Clear
          </motion.button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 14, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
        <SlipBody
          betSlip={betSlip} balance={balance}
          onConfirm={(item) => setConfirmItem(item)}
          totalStake={totalStake}
        />
      </div>

      <ConfirmBetModal
        visible={!!confirmItem}
        selection={confirmItem?.selection}
        marketName={confirmItem?.marketName}
        odds={confirmItem?.odds || 0}
        stake={confirmItem?.stake || 0}
        potReturn={Math.round((confirmItem?.stake || 0) * (confirmItem?.odds || 1))}
        onConfirm={() => handlePlaceBet(confirmItem)}
        onCancel={() => setConfirmItem(null)}
        loading={placing}
      />
    </div>
  );
}

// ── Shared body content ────────────────────────────────────
function SlipBody({ betSlip, balance, onConfirm, totalStake }) {
  if (betSlip.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 12px' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎲</div>
        <p style={{ margin: 0, color: '#8888AA', fontSize: 13 }}>
          Add a bet to get started
        </p>
        <p style={{ margin: '4px 0 0', color: '#555', fontSize: 11 }}>
          Click any odds button to add to your slip
        </p>
      </div>
    );
  }

  const insufficientBalance = totalStake > balance;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence mode="popLayout">
        {betSlip.map((item) => (
          <SlipItem key={item.marketId} item={item} balance={balance} />
        ))}
      </AnimatePresence>

      {/* Total + place all */}
      <div
        style={{
          borderTop: '1px solid #2A2A42', paddingTop: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8888AA', fontSize: 12 }}>Total Stake</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
            ₹{totalStake.toLocaleString('en-IN')}
          </span>
        </div>

        {insufficientBalance && (
          <div style={{ color: '#FF4560', fontSize: 11, textAlign: 'center' }}>
            ⚠️ Total stake exceeds your balance of ₹{balance.toLocaleString('en-IN')}
          </div>
        )}

        {/* Place each bet individually */}
        {betSlip.map((item) => (
          <motion.button
            key={item.marketId}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={!item.stake || item.stake < 50 || item.stake > balance}
            onClick={() => onConfirm(item)}
            style={{
              width: '100%', padding: '10px 0',
              background: (!item.stake || item.stake < 50 || item.stake > balance) ? '#2A2A42' : '#6C63FF',
              border: 'none', borderRadius: 10,
              color: '#FFFFFF', fontSize: 12, fontWeight: 700,
              cursor: (!item.stake || item.stake < 50 || item.stake > balance) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            Place: {item.selection} — ₹{(item.stake || 0).toLocaleString('en-IN')} @ {parseFloat(item.odds || 0).toFixed(2)}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
