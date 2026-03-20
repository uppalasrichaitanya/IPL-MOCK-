// ═══════════════════════════════════════════════════════════
// components/Navbar.jsx — Top navigation bar
// Desktop: logo | nav links | balance + username | daily bonus
// Mobile:  logo | balance (compact) | hamburger
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import BalanceBar from './BalanceBar';
import useUserStore from '../store/useUserStore';
import useToastStore from '../hooks/useToast';

const NAV_LINKS = [
  { label: 'Home',        to: '/' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Profile',     to: '/profile' },
];

function NavLink({ to, label }) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

  return (
    <Link
      to={to}
      style={{ position: 'relative', textDecoration: 'none', padding: '6px 0' }}
    >
      <span
        style={{
          color: isActive ? '#FFFFFF' : '#8888AA',
          fontWeight: isActive ? 600 : 400,
          fontSize: 14,
          transition: 'color 200ms',
        }}
      >
        {label}
      </span>

      {/* Animated underline */}
      {isActive && (
        <motion.div
          layoutId="nav-underline"
          style={{
            position: 'absolute',
            bottom: -2,
            left: 0,
            right: 0,
            height: 2,
            background: '#6C63FF',
            borderRadius: 2,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
}

function DailyBonusButton({ userId }) {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(null);
  const updateBalance = useUserStore((s) => s.updateBalance);
  const addToast      = useToastStore((s) => s.addToast);
  const BACKEND       = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const handleClaim = async () => {
    if (claimed || loading) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND}/api/auth/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Parse hours left from error message
        const match = data.error?.match(/(\d+) hours?/);
        if (match) setHoursLeft(parseInt(match[1]));
        setClaimed(true);
        addToast('warning', 'Already claimed', data.error || 'Come back tomorrow!');
      } else {
        updateBalance(data.newBalance);
        addToast('success', '₹500 bonus claimed! 🎉', 'Your daily coins are in.');
        setClaimed(true);
      }
    } catch {
      addToast('error', 'Network error', 'Could not claim bonus. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClaim}
      disabled={loading}
      animate={!claimed ? { boxShadow: ['0 0 0px #FFD70000', '0 0 12px #FFD70066', '0 0 0px #FFD70000'] } : {}}
      transition={!claimed ? { repeat: Infinity, duration: 2 } : {}}
      style={{
        background: claimed ? '#1A1A2E' : 'linear-gradient(135deg, #FFD700, #FFA500)',
        border: '1px solid ' + (claimed ? '#2A2A42' : '#FFD700'),
        borderRadius: 20,
        padding: '5px 12px',
        cursor: claimed ? 'default' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: claimed ? '#8888AA' : '#080810',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
      }}
    >
      🪙 {loading ? '...' : claimed ? (hoursLeft ? `${hoursLeft}h` : 'Claimed') : '+₹500'}
    </motion.button>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { balance, previousBalance, username, isLoggedIn, userId } = useUserStore();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'rgba(8,8,16,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2A2A42',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 20px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <motion.span
              whileHover={{ scale: 1.03 }}
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#6C63FF',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.03em',
              }}
            >
              🏏 IPL Bet
            </motion.span>
          </Link>

          {/* Desktop nav links */}
          <div
            className="hidden md:flex"
            style={{ display: 'flex', gap: 28, alignItems: 'center' }}
          >
            {NAV_LINKS.map((l) => <NavLink key={l.to} {...l} />)}
          </div>

          {/* Desktop right: balance + username + bonus */}
          <div
            className="hidden md:flex"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {isLoggedIn && (
              <>
                <DailyBonusButton userId={userId} />
                <div
                  style={{
                    background: '#1A1A2E',
                    border: '1px solid #2A2A42',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 13,
                    color: '#8888AA',
                  }}
                >
                  {username}
                </div>
              </>
            )}
            <BalanceBar balance={balance} previousBalance={previousBalance} />
          </div>

          {/* Mobile: compact balance + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="md:hidden">
              <BalanceBar balance={balance} previousBalance={previousBalance} compact />
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen((o) => !o)}
              style={{
                background: 'none', border: '1px solid #2A2A42',
                borderRadius: 8, padding: 6, cursor: 'pointer',
                color: '#FFFFFF', display: 'flex', alignItems: 'center',
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{   opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                overflow: 'hidden',
                background: '#1A1A2E',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid #2A2A42',
              }}
            >
              <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Username + balance row */}
                {isLoggedIn && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8888AA', fontSize: 13 }}>{username}</span>
                    <BalanceBar balance={balance} previousBalance={previousBalance} compact />
                  </div>
                )}
                {/* Nav links */}
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    style={{
                      textDecoration: 'none',
                      color: pathname === l.to ? '#6C63FF' : '#FFFFFF',
                      fontWeight: pathname === l.to ? 600 : 400,
                      fontSize: 16,
                      padding: '8px 0',
                      borderBottom: '1px solid #2A2A42',
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
                {/* Daily bonus in mobile */}
                {isLoggedIn && (
                  <div style={{ paddingTop: 4 }}>
                    <DailyBonusButton userId={userId} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
