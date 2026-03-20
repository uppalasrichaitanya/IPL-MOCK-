// ═══════════════════════════════════════════════════════════
// components/ConfirmBetModal.jsx — Bet placement confirmation
// ═══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmBetModal
 *
 * Props:
 *   visible     {boolean}
 *   selection   {string}      — e.g. "Mumbai Indians"
 *   marketName  {string}      — e.g. "Match Winner"
 *   odds        {number}
 *   stake       {number}
 *   potReturn   {number}
 *   onConfirm   {() => void}
 *   onCancel    {() => void}
 *   loading     {boolean}
 */
export default function ConfirmBetModal({
  visible    = false,
  selection  = '',
  marketName = '',
  odds       = 0,
  stake      = 0,
  potReturn  = 0,
  onConfirm,
  onCancel,
  loading    = false,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9060,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={onCancel}
        >
          <motion.div
            key="confirm-card"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1A1A2E',
              border: '1px solid #2A2A42',
              borderRadius: 20,
              padding: '28px 24px',
              maxWidth: 400,
              width: '100%',
            }}
          >
            {/* Title */}
            <h3 style={{ margin: '0 0 20px', color: '#FFFFFF', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>
              Confirm Your Bet
            </h3>

            {/* Summary */}
            <div
              style={{
                background: '#10101E',
                border: '1px solid #2A2A42',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              <Row label="Market"   value={marketName} />
              <Row label="Selection" value={selection} highlight />
              <Row label="Odds"     value={parseFloat(odds).toFixed(2)} mono />
              <Row label="Stake"    value={`₹${stake.toLocaleString('en-IN')}`} mono />
              <div style={{ borderTop: '1px solid #2A2A42', paddingTop: 10 }}>
                <Row
                  label="Potential Return"
                  value={`₹${potReturn.toLocaleString('en-IN')}`}
                  mono
                  highlight
                  big
                />
              </div>
            </div>

            {/* Warning */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,215,0,0.08)',
                border: '1px solid rgba(255,215,0,0.2)',
                borderRadius: 10,
                padding: '8px 12px',
                marginBottom: 20,
              }}
            >
              <AlertTriangle size={14} color="#FFD700" />
              <span style={{ fontSize: 11, color: '#FFD700' }}>
                Odds may change between now and placement.
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCancel}
                style={{
                  flex: 1, padding: '12px 0',
                  background: '#10101E',
                  border: '1px solid #2A2A42',
                  borderRadius: 12,
                  color: '#8888AA', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                disabled={loading}
                style={{
                  flex: 1, padding: '12px 0',
                  background: loading ? '#3A3A5C' : '#6C63FF',
                  border: 'none',
                  borderRadius: 12,
                  color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Placing...' : 'Confirm Bet'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, mono = false, highlight = false, big = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#8888AA', fontSize: 12 }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'Inter, sans-serif',
          fontWeight: highlight ? 700 : 500,
          fontSize: big ? 18 : 14,
          color: highlight ? '#6C63FF' : '#FFFFFF',
        }}
      >
        {value}
      </span>
    </div>
  );
}
