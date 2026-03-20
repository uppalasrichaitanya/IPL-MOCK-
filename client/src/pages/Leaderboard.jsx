// ═══════════════════════════════════════════════════════════
// pages/Leaderboard.jsx — Global leaderboard with podium
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useUserStore from '../store/useUserStore';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const TABS = [
  { key: 'balance',    label: '💰 By Balance',    field: 'balance' },
  { key: 'win_rate',   label: '📈 By Win Rate',   field: 'win_rate' },
  { key: 'biggest_win',label: '🏆 By Biggest Win',field: 'biggest_win' },
  { key: 'roi',        label: '🎯 By ROI',        field: 'roi' },
];

const MEDAL = ['👑', '🥈', '🥉'];

// ── Podium card (top 3) ───────────────────────────────────
function PodiumCard({ user, rank, field, isMe }) {
  const isFirst = rank === 0;
  const medal = MEDAL[rank] || '';
  const initials = (user.username || '??').slice(0, 2).toUpperCase();

  // Color by rank
  const borderColor = rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : '#CD7F32';

  const displayValue = () => {
    switch (field) {
      case 'win_rate': return `${parseFloat(user.win_rate || 0).toFixed(1)}%`;
      case 'biggest_win': return `₹${(user.biggest_win || 0).toLocaleString('en-IN')}`;
      case 'roi': return `${parseFloat(user.roi || 0).toFixed(1)}%`;
      default: return `₹${(user.balance || 0).toLocaleString('en-IN')}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1, type: 'spring', stiffness: 260 }}
      style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 1,
        background: `linear-gradient(135deg, ${borderColor}, #2A2A42)`,
        borderRadius: 20,
        transform: isFirst ? 'scale(1.08)' : 'scale(1)',
        zIndex: isFirst ? 2 : 1,
        order: rank === 0 ? 1 : rank === 1 ? 0 : 2,
      }}
    >
      <div
        style={{
          width: '100%',
          background: isMe ? 'rgba(108,99,255,0.12)' : '#1A1A2E',
          borderRadius: 19,
          padding: '20px 12px 16px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: isFirst ? 32 : 24 }}>{medal}</span>
        {/* Avatar */}
        <div style={{
          width: isFirst ? 56 : 44, height: isFirst ? 56 : 44,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${borderColor}33, ${borderColor}66)`,
          border: `2px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isFirst ? 18 : 14, fontWeight: 700, color: borderColor,
        }}>
          {initials}
        </div>
        <span style={{
          color: '#FFFFFF', fontWeight: 700,
          fontSize: isFirst ? 15 : 13,
          textAlign: 'center', wordBreak: 'break-all',
        }}>
          {user.username}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700, fontSize: isFirst ? 18 : 14,
          color: borderColor,
        }}>
          {displayValue()}
        </span>
        <div style={{
          display: 'flex', gap: 8, fontSize: 10, color: '#8888AA',
        }}>
          <span>{user.total_bets || 0} bets</span>
          <span>•</span>
          <span>WR {parseFloat(user.win_rate || 0).toFixed(0)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Standard row (ranks 4–20) ─────────────────────────────
function RankRow({ user, rank, field, isMe, delay }) {
  const displayValue = () => {
    switch (field) {
      case 'win_rate': return `${parseFloat(user.win_rate || 0).toFixed(1)}%`;
      case 'biggest_win': return `₹${(user.biggest_win || 0).toLocaleString('en-IN')}`;
      case 'roi': return `${parseFloat(user.roi || 0).toFixed(1)}%`;
      default: return `₹${(user.balance || 0).toLocaleString('en-IN')}`;
    }
  };

  const initials = (user.username || '??').slice(0, 2).toUpperCase();
  const trend = user.trend; // 'up' | 'down' | null

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 36px 1fr auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: isMe ? 'rgba(108,99,255,0.1)' : '#10101E',
        border: `1px solid ${isMe ? '#6C63FF' : '#2A2A42'}`,
        borderLeft: isMe ? '4px solid #6C63FF' : '1px solid #2A2A42',
        borderRadius: 12,
      }}
    >
      {/* Rank */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700, color: '#8888AA', fontSize: 14,
      }}>
        #{rank + 1}
      </span>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#1A1A2E', border: '1px solid #2A2A42',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#8888AA',
      }}>
        {initials}
      </div>
      {/* Username + stats */}
      <div>
        <div style={{ color: isMe ? '#6C63FF' : '#FFFFFF', fontWeight: 600, fontSize: 13 }}>
          {user.username} {isMe && '(You)'}
        </div>
        <div style={{ color: '#8888AA', fontSize: 10 }}>
          WR {parseFloat(user.win_rate || 0).toFixed(0)}% · {user.total_bets || 0} bets
        </div>
      </div>
      {/* Value */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700, fontSize: 14, color: '#FFFFFF',
      }}>
        {displayValue()}
      </span>
      {/* Trend */}
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: trend === 'up' ? '#00E676' : trend === 'down' ? '#FF4560' : '#8888AA',
      }}>
        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
export default function Leaderboard() {
  const { userId } = useUserStore();
  const [activeTab, setActiveTab]    = useState('balance');
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank]           = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/leaderboard?tab=${activeTab}`)
      .then((r) => r.json())
      .then((d) => {
        setLeaderboard(d.leaderboard || []);
        setMyRank(d.myRank ?? null);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 20);
  const field = TABS.find((t) => t.key === activeTab)?.field || 'balance';
  const meInTop20 = leaderboard.some((u) => u.id === userId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 80px' }}
    >
      <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
        🏆 Leaderboard
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === tab.key ? '#6C63FF' : '#10101E',
              color: activeTab === tab.key ? '#FFFFFF' : '#8888AA',
              transition: 'all 200ms',
            }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {loading ? (
        /* Skeleton */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: 56, borderRadius: 12,
                background: 'linear-gradient(90deg,#1A1A2E 25%,#2A2A42 50%,#1A1A2E 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div style={{
              display: 'flex', gap: 10, marginBottom: 20,
              alignItems: 'flex-end',
              flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {top3.map((user, i) => (
                <PodiumCard
                  key={user.id || i}
                  user={user}
                  rank={i}
                  field={field}
                  isMe={user.id === userId}
                />
              ))}
            </div>
          )}

          {/* Ranks 4–20 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rest.map((user, i) => (
              <RankRow
                key={user.id || i}
                user={user}
                rank={i + 3}
                field={field}
                isMe={user.id === userId}
                delay={i * 0.05}
              />
            ))}
          </div>

          {/* My rank if not in top 20 */}
          {!meInTop20 && myRank != null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 20, padding: 14,
                background: '#1A1A2E', border: '1px solid #6C63FF',
                borderRadius: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ color: '#8888AA', fontSize: 13 }}>Your Rank</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, fontSize: 20, color: '#6C63FF',
              }}>
                #{myRank}
              </span>
            </motion.div>
          )}

          {/* Empty */}
          {leaderboard.length === 0 && (
            <div style={{ color: '#8888AA', textAlign: 'center', padding: 40, fontSize: 13 }}>
              No leaderboard data yet. Play some matches!
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
