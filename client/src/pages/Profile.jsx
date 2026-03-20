// ═══════════════════════════════════════════════════════════
// pages/Profile.jsx — User stats, chart, bet history, settings
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Line
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import {
  Target, TrendingUp, Coins, Trophy, Flame, CheckCircle,
  ChevronLeft, ChevronRight, Clock, Volume2, VolumeX, Shield,
} from 'lucide-react';
import useUserStore from '../store/useUserStore';
import useBetStore from '../store/useBetStore';
import useToastStore from '../hooks/useToast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ITEMS_PER_PAGE = 20;
const TABS = ['All', 'Won', 'Lost', 'Pending', 'Cashed Out'];
const TAB_FILTER = { All: '', Won: 'won', Lost: 'lost', Pending: 'pending', 'Cashed Out': 'cashed_out' };

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ icon, label, value, color = '#FFFFFF', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        background: '#1A1A2E', borderRadius: 16,
        padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
        border: '1px solid #2A2A42',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color: '#8888AA', fontSize: 12 }}>{label}</span>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 24, fontWeight: 700, color,
      }}>
        {value}
      </span>
    </motion.div>
  );
}

// ── Result Pill ───────────────────────────────────────────
function ResultPill({ result }) {
  const map = {
    won:       { bg: 'rgba(0,230,118,0.15)', color: '#00E676', text: 'WON' },
    lost:      { bg: 'rgba(255,69,96,0.15)',  color: '#FF4560', text: 'LOST' },
    pending:   { bg: 'rgba(0,212,255,0.15)',  color: '#00D4FF', text: 'PENDING' },
    cashed_out:{ bg: 'rgba(255,215,0,0.15)',  color: '#FFD700', text: 'CASHED' },
  };
  const s = map[result] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 8,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {result === 'pending' && (
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ marginRight: 4 }}
        >●</motion.span>
      )}
      {s.text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Profile Page
// ═══════════════════════════════════════════════════════════
export default function Profile() {
  const { userId, username, balance } = useUserStore();
  const betHistory  = useBetStore((s) => s.betHistory);
  const setBetHistory = useBetStore((s) => s.setBetHistory);
  const addToast    = useToastStore((s) => s.addToast);

  // ── State ────────────────────────────────────────────────
  const [stats, setStats]             = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab]     = useState('All');
  const [page, setPage]               = useState(1);

  // Settings
  const [dailyLimit, setDailyLimit]   = useState(() => localStorage.getItem('ipl_dailyLimit') || '');
  const [oddsFormat, setOddsFormat]   = useState(() => localStorage.getItem('ipl_oddsFormat') || 'decimal');
  const [soundOn, setSoundOn]         = useState(() => localStorage.getItem('ipl_sound') !== 'off');
  const [breakUntil, setBreakUntil]   = useState(() => {
    const saved = localStorage.getItem('ipl_breakUntil');
    return saved && new Date(saved) > new Date() ? new Date(saved) : null;
  });
  const [breakCountdown, setBreakCountdown] = useState('');

  // ── Fetch data ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Fetch stats
    fetch(`${BACKEND}/api/auth/profile?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.user) setStats(d.user); })
      .catch(() => {});

    // Fetch transactions for chart
    fetch(`${BACKEND}/api/auth/transactions?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.transactions) setTransactions(d.transactions); })
      .catch(() => {});

    // Fetch bet history
    fetch(`${BACKEND}/api/bets/history?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.bets) setBetHistory(d.bets); })
      .catch(() => {});
  }, [userId, setBetHistory]);

  // ── Break timer countdown ─────────────────────────────
  useEffect(() => {
    if (!breakUntil) return;
    const tick = () => {
      const diff = breakUntil - new Date();
      if (diff <= 0) {
        setBreakUntil(null);
        localStorage.removeItem('ipl_breakUntil');
        setBreakCountdown('');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBreakCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [breakUntil]);

  // ── Computed stats ──────────────────────────────────────
  const computed = useMemo(() => {
    const totalBets  = stats?.total_bets || 0;
    const totalWon   = stats?.total_won || 0;
    const totalLost  = stats?.total_lost || 0;
    const winRate    = totalBets > 0 ? ((totalWon / totalBets) * 100).toFixed(1) : '0.0';
    const biggestWin = stats?.biggest_win || 0;
    // Calculate current streak from history
    let streak = 0;
    const sorted = [...(betHistory || [])].filter((b) => b.result === 'won' || b.result === 'lost');
    if (sorted.length > 0) {
      const first = sorted[0]?.result;
      for (const b of sorted) {
        if (b.result === first) streak++;
        else break;
      }
      if (first === 'lost') streak = -streak;
    }
    return { totalBets, totalWon, totalLost, winRate, biggestWin, streak };
  }, [stats, betHistory]);

  // ── Chart data ──────────────────────────────────────────
  const chartData = useMemo(() => {
    // Build last 30 days
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    // Map transactions to daily balance
    const balMap = {};
    for (const tx of transactions) {
      const day = (tx.created_at || '').slice(0, 10);
      if (tx.balance_after != null) balMap[day] = tx.balance_after;
    }
    let lastBal = 10000;
    const values = days.map((d) => {
      if (balMap[d] != null) lastBal = balMap[d];
      return lastBal;
    });

    return {
      labels: days.map((d) => d.slice(5)), // MM-DD
      datasets: [{
        label: 'Balance',
        data: values,
        borderColor: '#6C63FF',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(108,99,255,0.1)';
          const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          grad.addColorStop(0, 'rgba(108,99,255,0.3)');
          grad.addColorStop(1, 'rgba(108,99,255,0.02)');
          return grad;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#6C63FF',
        borderWidth: 2,
      }],
    };
  }, [transactions]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A1A2E',
        borderColor: '#2A2A42',
        borderWidth: 1,
        titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 13 },
        callbacks: {
          label: (ctx) => `₹${ctx.parsed.y.toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(42,42,66,0.4)' },
        ticks: { color: '#8888AA', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(42,42,66,0.4)' },
        ticks: {
          color: '#8888AA',
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          callback: (v) => `₹${v.toLocaleString('en-IN')}`,
        },
      },
    },
  };

  // ── Filtered + paginated bets ─────────────────────────
  const filteredBets = useMemo(() => {
    const filter = TAB_FILTER[activeTab];
    if (!filter) return betHistory || [];
    return (betHistory || []).filter((b) => b.result === filter);
  }, [betHistory, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredBets.length / ITEMS_PER_PAGE));
  const pagedBets  = filteredBets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Settings handlers ──────────────────────────────────
  const saveDailyLimit = (val) => {
    setDailyLimit(val);
    localStorage.setItem('ipl_dailyLimit', val);
  };
  const toggleOddsFormat = () => {
    const next = oddsFormat === 'decimal' ? 'fractional' : 'decimal';
    setOddsFormat(next);
    localStorage.setItem('ipl_oddsFormat', next);
  };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem('ipl_sound', next ? 'on' : 'off');
  };
  const takeBreak = (hours) => {
    const until = new Date(Date.now() + hours * 3600000);
    setBreakUntil(until);
    localStorage.setItem('ipl_breakUntil', until.toISOString());
    addToast('info', `Break activated for ${hours}h`, 'Betting locked until break ends.');
  };

  // ═══════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 80px' }}
    >
      {/* Username header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
          👤 {username || 'Guest'}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#8888AA', fontSize: 13 }}>
          Balance: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00E676', fontWeight: 700 }}>
            ₹{(balance || 0).toLocaleString('en-IN')}
          </span>
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT COLUMN: Stats + Chart ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <StatCard icon="🎯" label="Total Bets"    value={computed.totalBets}   delay={0}    />
            <StatCard icon="📈" label="Win Rate"      value={`${computed.winRate}%`} color="#00E676" delay={0.05} />
            <StatCard icon="🪙" label="Total Wagered" value={`₹${(computed.totalWon + computed.totalLost).toLocaleString('en-IN')}`} delay={0.1} />
            <StatCard icon="✅" label="Total Won"     value={`₹${computed.totalWon.toLocaleString('en-IN')}`} color="#00E676" delay={0.15} />
            <StatCard icon="🏆" label="Biggest Win"   value={`₹${computed.biggestWin.toLocaleString('en-IN')}`} color="#FFD700" delay={0.2} />
            <StatCard icon="🔥" label="Streak"        value={computed.streak >= 0 ? `${computed.streak}W` : `${Math.abs(computed.streak)}L`}
              color={computed.streak >= 0 ? '#00E676' : '#FF4560'} delay={0.25} />
          </div>

          {/* Balance History Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: '#1A1A2E', borderRadius: 16, padding: 20,
              border: '1px solid #2A2A42',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
              📉 Balance History (30 Days)
            </h3>
            <div style={{ height: 220 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: Bet History ────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: activeTab === tab ? '#6C63FF' : 'transparent',
                  color: activeTab === tab ? '#FFFFFF' : '#8888AA',
                  transition: 'all 200ms',
                }}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          {/* Bet rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence mode="popLayout">
              {pagedBets.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: '#8888AA', textAlign: 'center', padding: 32, fontSize: 13 }}
                >
                  No bets found
                </motion.div>
              ) : (
                pagedBets.map((bet, i) => (
                  <motion.div
                    key={bet.id || i}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      background: '#10101E', border: '1px solid #2A2A42',
                      borderRadius: 14, padding: 14,
                      display: 'grid', gridTemplateColumns: '1fr auto',
                      gap: 8, alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#8888AA', fontSize: 10 }}>
                          {bet.created_at ? new Date(bet.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                        </span>
                        <span style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>{bet.market_name || 'Market'}</span>
                        <ResultPill result={bet.result} />
                      </div>
                      <div style={{ color: '#8888AA', fontSize: 11 }}>{bet.selection}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#8888AA' }}>
                          Stake: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF' }}>₹{(bet.stake || 0).toLocaleString('en-IN')}</span>
                        </span>
                        <span style={{ fontSize: 11, color: '#8888AA' }}>
                          Odds: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#6C63FF' }}>{parseFloat(bet.odds_at_placement || 0).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                    {/* P&L */}
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700, fontSize: 14, textAlign: 'right',
                      color: bet.result === 'won' ? '#00E676' : bet.result === 'lost' ? '#FF4560' : '#8888AA',
                    }}>
                      {bet.result === 'won' && `+₹${((bet.potential_return || 0) - (bet.stake || 0)).toLocaleString('en-IN')}`}
                      {bet.result === 'lost' && `-₹${(bet.stake || 0).toLocaleString('en-IN')}`}
                      {bet.result === 'pending' && '—'}
                      {bet.result === 'cashed_out' && `₹${(bet.cash_out_value || 0).toLocaleString('en-IN')}`}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    background: 'none', border: '1px solid #2A2A42',
                    borderRadius: 8, padding: '6px 10px', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    color: '#8888AA', opacity: page <= 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </motion.button>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 12 }}>
                  {page} / {totalPages}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    background: 'none', border: '1px solid #2A2A42',
                    borderRadius: 8, padding: '6px 10px', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    color: '#8888AA', opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SETTINGS SECTION ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: 32,
          background: '#1A1A2E', border: '1px solid #2A2A42',
          borderRadius: 16, padding: 24,
        }}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
          ⚙️ Settings
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

          {/* Daily bet limit */}
          <div>
            <label style={{ color: '#8888AA', fontSize: 12, display: 'block', marginBottom: 6 }}>Daily Bet Limit</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#8888AA' }}>₹</span>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => saveDailyLimit(e.target.value)}
                placeholder="No limit"
                style={{
                  flex: 1, background: '#10101E', border: '1px solid #2A2A42',
                  borderRadius: 10, padding: '8px 12px', color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Odds format */}
          <div>
            <label style={{ color: '#8888AA', fontSize: 12, display: 'block', marginBottom: 6 }}>Odds Format</label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleOddsFormat}
              style={{
                background: '#10101E', border: '1px solid #2A2A42',
                borderRadius: 10, padding: '8px 16px',
                color: '#6C63FF', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {oddsFormat === 'decimal' ? '1.85 Decimal' : '17/20 Fractional'}
            </motion.button>
          </div>

          {/* Sound toggle */}
          <div>
            <label style={{ color: '#8888AA', fontSize: 12, display: 'block', marginBottom: 6 }}>Sound Effects</label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleSound}
              style={{
                background: '#10101E', border: '1px solid #2A2A42',
                borderRadius: 10, padding: '8px 16px',
                color: soundOn ? '#00E676' : '#FF4560', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundOn ? 'On' : 'Off'}
            </motion.button>
          </div>

          {/* Take a break */}
          <div>
            <label style={{ color: '#8888AA', fontSize: 12, display: 'block', marginBottom: 6 }}>
              <Shield size={12} style={{ marginRight: 4 }} />
              Responsible Gaming
            </label>
            {breakUntil ? (
              <div style={{
                background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.3)',
                borderRadius: 10, padding: '8px 14px', color: '#FF4560', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Clock size={12} />
                Break active: {breakCountdown}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => takeBreak(1)}
                  style={{
                    background: '#10101E', border: '1px solid #2A2A42',
                    borderRadius: 10, padding: '8px 14px',
                    color: '#FFD700', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  1hr Break
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => takeBreak(24)}
                  style={{
                    background: '#10101E', border: '1px solid #FF4560',
                    borderRadius: 10, padding: '8px 14px',
                    color: '#FF4560', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  24hr Break
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
