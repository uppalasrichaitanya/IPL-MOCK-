// ═══════════════════════════════════════════════════════════
// pages/Home.jsx — Match Lobby (full implementation)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Scoreboard from '../components/Scoreboard';
import { ScoreboardSkeleton, MatchCardSkeleton } from '../components/Skeletons';
import TeamBadge from '../components/TeamBadge';
import useMatchStore from '../store/useMatchStore';
import useBetStore from '../store/useBetStore';
import { useLiveScore } from '../hooks/useLiveScore';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ── IPL 2026 countdown ──────────────────────────────────────
const IPL_START = new Date('2026-03-28T14:00:00+05:30');

function CountdownBig() {
  const [diff, setDiff] = useState(IPL_START - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(IPL_START - Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (diff <= 0) return null;

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', margin: '20px 0' }}>
      {[['Days', days], ['Hours', hours], ['Mins', mins], ['Secs', secs]].map(([label, val]) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 36, fontWeight: 700, color: '#6C63FF',
            background: '#1A1A2E', border: '1px solid #2A2A42',
            borderRadius: 14, padding: '12px 18px', minWidth: 70,
          }}>
            {String(val).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 11, color: '#8888AA', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Match card ──────────────────────────────────────────────
function MatchCard({ match, index }) {
  const navigate    = useNavigate();
  const addToBetSlip = useBetStore((s) => s.addToBetSlip);

  const t1 = match.team1 || {};
  const t2 = match.team2 || {};
  const odds = match.odds || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(108,99,255,0.2)' }}
      style={{
        background: '#10101E',
        border: '1px solid #2A2A42',
        borderRadius: 20,
        padding: 20,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamBadge team={t1.short} size="md" />
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>{t1.name || 'Team A'}</div>
            {match.isLive && t1.score !== undefined && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontSize: 20, fontWeight: 700 }}>
                {t1.score}/{t1.wickets}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 11, marginLeft: 4 }}>
                  ({t1.overs})
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ color: '#8888AA', fontSize: 13, fontWeight: 600 }}>vs</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right' }}>
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>{t2.name || 'Team B'}</div>
            {match.isLive && t2.score !== undefined && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontSize: 20, fontWeight: 700, textAlign: 'right' }}>
                {t2.score}/{t2.wickets}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 11, marginLeft: 4 }}>
                  ({t2.overs})
                </span>
              </div>
            )}
          </div>
          <TeamBadge team={t2.short} size="md" />
        </div>
      </div>

      {/* Venue + time */}
      <div style={{ display: 'flex', gap: 16, color: '#8888AA', fontSize: 12 }}>
        {match.venue && <span>📍 {match.venue}</span>}
        {match.startTime && <span>🕐 {new Date(match.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* Odds buttons */}
      {(odds.team1 || odds.team2) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { team: t1, odd: odds.team1, marketId: `${match.id}_winner` },
            { team: t2, odd: odds.team2, marketId: `${match.id}_winner_t2` },
          ].map(({ team, odd, marketId }) => (
            <motion.button
              key={marketId}
              whileHover={{ background: 'rgba(108,99,255,0.2)' }}
              whileTap={{ scale: 0.96 }}
              onClick={(e) => {
                e.stopPropagation();
                addToBetSlip({ marketId, selection: team.name, odds: odd, matchId: match.id });
              }}
              style={{
                background: '#1A1A2E',
                border: '1px solid #2A2A42',
                borderRadius: 12,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#8888AA', fontSize: 11, marginBottom: 2 }}>{team.name || '—'}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#6C63FF', fontWeight: 700, fontSize: 16 }}>
                {odd ? parseFloat(odd).toFixed(2) : '—'}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Bottom row: live indicator + bet now */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {match.isLive ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#FF4560', opacity: 0.7, animation: 'ping 1.5s infinite' }} />
              <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#FF4560' }} />
            </span>
            <span style={{ color: '#FF4560', fontSize: 11, fontWeight: 700 }}>LIVE</span>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#8888AA' }}>Upcoming</span>
        )}

        {match.isLive && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); navigate(`/match/${match.id}`); }}
            style={{
              background: '#6C63FF', border: 'none', borderRadius: 8,
              padding: '6px 14px', color: '#FFFFFF', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Bet Now →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Section heading ─────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <div style={{ width: 3, height: 22, background: '#FFD700', borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>{children}</h2>
    </div>
  );
}

// ── Home page ───────────────────────────────────────────────
export default function Home() {
  const [matches, setMatches] = useState([]);
  const [matchLoading, setMatchLoading] = useState(true);
  const { isConnected } = useLiveScore();
  const scoreData = useMatchStore((s) => s.scoreData);

  // Fetch matches from backend
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res  = await fetch(`${BACKEND}/api/score/live`);
        const data = await res.json();
        setMatches(data.matches || []);
      } catch {
        setMatches([]);
      } finally {
        setMatchLoading(false);
      }
    };
    fetchMatches();
  }, []);

  // When socket updates arrive, refresh match list
  useEffect(() => {
    if (scoreData?.matches) {
      setMatches(scoreData.matches);
      setMatchLoading(false);
    }
  }, [scoreData]);

  const liveMatches     = matches.filter((m) => m.isLive);
  const upcomingMatches = matches.filter((m) => !m.isLive);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '24px 20px 80px',
      }}
    >
      {/* Scoreboard */}
      {!isConnected && matchLoading ? <ScoreboardSkeleton /> : <Scoreboard />}

      {/* Live matches section */}
      {(liveMatches.length > 0 || matchLoading) && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeading>🔴 Live Matches</SectionHeading>
          {matchLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {liveMatches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
            </div>
          )}
        </section>
      )}

      {/* Upcoming matches section */}
      {upcomingMatches.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeading>📅 Upcoming Matches</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {upcomingMatches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
          </div>
        </section>
      )}

      {/* Empty state — no matches at all */}
      {!matchLoading && matches.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏏</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
            IPL 2026 kicks off March 28!
          </h2>
          <p style={{ color: '#8888AA', margin: 0 }}>
            Get ready to place your game-coin bets on live matches
          </p>
          <CountdownBig />
        </motion.div>
      )}
    </motion.div>
  );
}
