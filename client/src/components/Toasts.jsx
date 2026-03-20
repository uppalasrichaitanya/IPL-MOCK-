// ═══════════════════════════════════════════════════════════
// components/Toasts.jsx — Toast notification system
// Fixed top-right, stacked, Framer Motion AnimatePresence
// ═══════════════════════════════════════════════════════════

import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import useToastStore from '../hooks/useToast';

const TOAST_STYLES = {
  success: { border: '#00E676', icon: CheckCircle,  iconColor: '#00E676' },
  error:   { border: '#FF4560', icon: XCircle,      iconColor: '#FF4560' },
  info:    { border: '#00D4FF', icon: Info,          iconColor: '#00D4FF' },
  warning: { border: '#FFD700', icon: AlertTriangle, iconColor: '#FFD700' },
};

function Toast({ toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const cfg = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      exit={{    x: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: '#1A1A2E',
        border: '1px solid #2A2A42',
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        minWidth: 280,
        maxWidth: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Icon size={18} color={cfg.iconColor} style={{ flexShrink: 0, marginTop: 2 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#FFFFFF', lineHeight: 1.4 }}>
            {toast.title}
          </p>
        )}
        {toast.message && (
          <p style={{ margin: 0, fontSize: 13, color: '#8888AA', marginTop: 2, lineHeight: 1.4 }}>
            {toast.message}
          </p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#8888AA', padding: 0, flexShrink: 0,
        }}
      >
        <X size={14} />
      </motion.button>
    </motion.div>
  );
}

export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <Toast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
