// ═══════════════════════════════════════════════════════════
// App.jsx — Root component with all global components wired
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Pages
import Home        from './pages/Home';
import Match       from './pages/Match';
import Profile     from './pages/Profile';
import Leaderboard from './pages/Leaderboard';

// Components
import Navbar                   from './components/Navbar';
import Toasts                   from './components/Toasts';
import ResponsibleGamingFooter  from './components/ResponsibleGamingFooter';
import OnboardingModal          from './components/OnboardingModal';
import BankruptScreen           from './components/BankruptScreen';
import WinAnimation             from './components/WinAnimation';
import LossAnimation            from './components/LossAnimation';

// Hooks + stores
import { useLiveScore }  from './hooks/useLiveScore';
import useUserStore      from './store/useUserStore';

function AppInner() {
  const { isConnected } = useLiveScore();

  const { setUser, isLoggedIn, balance, userId } = useUserStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Win/Loss animation state
  const [winData, setWinData]       = useState(null);
  const [showLoss, setShowLoss]     = useState(false);

  // Restore session or show onboarding on first load
  useEffect(() => {
    const savedUsername = localStorage.getItem('ipl_username');
    const savedUserId   = localStorage.getItem('ipl_userId');

    if (!isLoggedIn) {
      if (savedUsername && savedUserId) {
        setUser(savedUsername, 0, savedUserId);
      } else {
        setShowOnboarding(true);
      }
    }
  }, []);                          // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global event listeners for bet settlements ────────
  useEffect(() => {
    const handleWin = (e) => {
      setWinData({
        amount: e.detail?.amount || 0,
        matchName: e.detail?.matchName || '',
        marketName: e.detail?.marketName || '',
      });
    };
    const handleLoss = () => setShowLoss(true);

    window.addEventListener('bet_won', handleWin);
    window.addEventListener('bet_lost', handleLoss);
    return () => {
      window.removeEventListener('bet_won', handleWin);
      window.removeEventListener('bet_lost', handleLoss);
    };
  }, []);

  // Bankrupt detection
  const isBankrupt = isLoggedIn && balance < 50;

  return (
    <>
      <Navbar />

      {/* Main content */}
      <main style={{ minHeight: 'calc(100vh - 60px - 36px)' }}>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/match/:id"   element={<Match />} />
          <Route path="/profile"     element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>

      <ResponsibleGamingFooter />

      {/* Global overlays */}
      <Toasts />

      {/* Onboarding modal — first-time users */}
      <OnboardingModal
        visible={showOnboarding && !isLoggedIn}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Bankrupt screen — when balance drops below ₹50 */}
      <AnimatePresence>
        {isBankrupt && (
          <BankruptScreen key="bankrupt" balance={balance} />
        )}
      </AnimatePresence>

      {/* Win animation — triggered via custom event */}
      <WinAnimation
        visible={!!winData}
        amount={winData?.amount || 0}
        matchName={winData?.matchName || ''}
        marketName={winData?.marketName || ''}
        onDismiss={() => setWinData(null)}
      />

      {/* Loss animation — triggered via custom event */}
      <LossAnimation
        visible={showLoss}
        onDismiss={() => setShowLoss(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
