// ═══════════════════════════════════════════════════════════
// components/Scoreboard.jsx — Live match scoreboard
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamBadge from './TeamBadge';
import useMatchStore from '../store/useMatchStore';

// ── Live badge ──────────────────────────────────────────────
function LiveBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ position: 'relative', width: 12, height: 12, display: 'inline-flex' }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: '#FF4560', opacity: 0.75,
          animation: 'ping 1.5s ease-in-out infinite',
        }} />
        <span style={{
          position: 'relative', width: 12, height: 12,
          borderRadius: '50%', background: '#FF4560', display: 'inline-flex',
        }} />
      </span>
      <span style={{ color: '#FF4560', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em' }}>
        LIVE
      </span>
    </span>
  );
}

// ── Countdown to next update ────────────────────────────────
function NextUpdateCountdown({ intervalMs = 10000 }) {
  const [secs, setSecs] = useState(Math.ceil(intervalMs / 1000));

  useEffect(() => {
    setSecs(Math.ceil(intervalMs / 1000));
    const interval = setInterval(() => {
      setSecs((s) => (s <= 1 ? Math.ceil(intervalMs / 1000) : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 12 }}>
      Next update in {secs}s
    </span>
  );
}

// ── Ball pill ───────────────────────────────────────────────
const BALL_STYLES = {
  '0':  { bg: 'rgba(26,26,46,0.8)', color: '#8888AA', border: '#2A2A42' },
  '1':  { bg: 'rgba(26,26,46,0.8)', color: '#FFFFFF', border: '#2A2A42' },
  '2':  { bg: 'rgba(26,26,46,0.8)', color: '#FFFFFF', border: '#2A2A42' },
  '3':  { bg: 'rgba(26,26,46,0.8)', color: '#FFFFFF', border: '#2A2A42' },
  '4':  { bg: 'rgba(0,212,255,0.15)', color: '#00D4FF', border: '#00D4FF' },
  '6':  { bg: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '#FFD700' },
  'W':  { bg: 'rgba(255,69,96,0.15)', color: '#FF4560', border: '#FF4560' },
  'Wd': { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '#EAB308' },
  'Nb': { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '#EAB308' },
};

function BallPill({ ball }) {
  const s = BALL_STYLES[ball] || BALL_STYLES['1'];
  return (
    <motion.span
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 30, height: 30,
        background: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: '50%',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700,
        padding: '0 6px',
      }}
    >
      {ball}
    </motion.span>
  );
}

// ── IPL 2026 start countdown ────────────────────────────────
const IPL_START = new Date('2026-03-28T14:00:00+05:30');

function CountdownTimer() {
  const [diff, setDiff] = useState(IPL_START - Date.now());

  useEffect(() => {
    const t = setInterval(() => setDiff(IPL_START - Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (diff <= 0) return <span style={{ color: '#00E676', fontWeight: 700 }}>IPL 2026 is LIVE! 🏏</span>;

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
      {[['Days', days], ['Hours', hours], ['Mins', mins], ['Secs', secs]].map(([label, val]) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28, fontWeight: 700,
            color: '#6C63FF',
            background: '#1A1A2E', border: '1px solid #2A2A42',
            borderRadius: 10, padding: '8px 14px', minWidth: 52,
          }}>
            {String(val).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 10, color: '#8888AA', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Scoreboard component ───────────────────────────────
export default function Scoreboard() {
  const [scrolled, setScrolled] = useState(false);
  const scoreData       = useMatchStore((s) => s.scoreData);
  const currentMatch    = useMatchStore((s) => s.currentMatch);
  const isLive          = useMatchStore((s) => s.isLive);
  const isScoreDelayed  = useMatchStore((s) => s.isScoreDelayed);

  // Scroll detection for mini bar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── No match state ─────────────────────────────────────────
  if (!currentMatch && !isLive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#10101E', border: '1px solid #2A2A42',
          borderRadius: 20, padding: '32px 24px', textAlign: 'center',
          margin: '0 0 24px',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
        <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: 18, fontWeight: 600 }}>
          No live IPL matches right now
        </h2>
        <p style={{ margin: '6px 0 0', color: '#8888AA', fontSize: 14 }}>
          IPL 2026 starts March 28, 2026
        </p>
        <CountdownTimer />
      </motion.div>
    );
  }

  const m   = currentMatch || {};
  const bt1 = m.batting?.[0] || {};
  const bt2 = m.batting?.[1] || {};
  const bwl = m.bowling?.[0] || {};
  const t1  = m.team1 || {};
  const t2  = m.team2 || {};
  const balls = (m.lastSixBalls || []).slice(-6);

  return (
    <>
      {/* ── Full scoreboard ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#10101E', border: '1px solid #2A2A42',
          borderRadius: 20, overflow: 'hidden', marginBottom: 24,
        }}
      >
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(108,99,255,0.06)',
          borderBottom: '1px solid #2A2A42',
        }}>
          {isScoreDelayed
            ? <span style={{ fontSize: 13, color: '#FFD700' }}>⚠️ Score Delayed</span>
            : isLive ? <LiveBadge />
            : <span style={{ color: '#8888AA', fontSize: 13 }}>● No Live Match</span>
          }
          <NextUpdateCountdown />
        </div>

        {/* Teams + scores */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', gap: 12, padding: '20px 24px',
        }}>
          {/* Team 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamBadge team={t1.short} size="md" />
              <span style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 14 }}>{t1.name || 'Team A'}</span>
            </div>
            {m.batting?.teamId === t1.id && (
              <span style={{ fontSize: 11, color: '#00E676', fontWeight: 600 }}>▶ Batting</span>
            )}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 36, fontWeight: 700, color: '#FFFFFF', lineHeight: 1,
            }}>
              {t1.score ?? '—'}{t1.wickets !== undefined ? `/${t1.wickets}` : ''}
            </span>
            {t1.overs !== undefined && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8888AA' }}>
                ({t1.overs} ov)
              </span>
            )}
          </div>

          {/* VS */}
          <div style={{ color: '#8888AA', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>VS</div>

          {/* Team 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#FFFFFF', fontSize: 14 }}>{t2.name || 'Team B'}</span>
              <TeamBadge team={t2.short} size="md" />
            </div>
            {m.batting?.teamId === t2.id && (
              <span style={{ fontSize: 11, color: '#00E676', fontWeight: 600 }}>▶ Batting</span>
            )}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 36, fontWeight: 700, color: '#FFFFFF', lineHeight: 1,
              textAlign: 'right',
            }}>
              {t2.score ?? '—'}{t2.wickets !== undefined ? `/${t2.wickets}` : ''}
            </span>
            {t2.overs !== undefined && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8888AA' }}>
                ({t2.overs} ov)
              </span>
            )}
          </div>
        </div>

        {/* Batters + bowler */}
        {(bt1.name || bwl.name) && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 1, borderTop: '1px solid #2A2A42',
          }}>
            {/* Batting */}
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: 10, color: '#8888AA', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                BAT
              </div>
              {[bt1, bt2].filter(b => b.name).map((b, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                      {b.runs}<span style={{ color: '#8888AA', fontSize: 11 }}>({b.balls})</span>
                    </span>
                  </div>
                  {b.strikeRate !== undefined && (
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 11 }}>
                      SR: {b.strikeRate}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bowling */}
            <div style={{ padding: '14px 20px', borderLeft: '1px solid #2A2A42' }}>
              <div style={{ fontSize: 10, color: '#8888AA', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                BOWL
              </div>
              {bwl.name && (
                <div>
                  <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>{bwl.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8888AA', fontSize: 11, marginTop: 2 }}>
                    {[bwl.overs, bwl.maidens, bwl.runs, bwl.wickets]
                      .filter(v => v !== undefined)
                      .join('-') || '—'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last 6 balls */}
        {balls.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid #2A2A42',
          }}>
            <span style={{ color: '#8888AA', fontSize: 12, whiteSpace: 'nowrap' }}>Last 6:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <AnimatePresence mode="popLayout">
                {balls.map((ball, i) => (
                  <BallPill key={`${ball}-${i}`} ball={String(ball)} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Run rates */}
        {m.crr !== undefined && (
          <div style={{
            display: 'flex', gap: 0,
            borderTop: '1px solid #2A2A42',
          }}>
            {[
              { label: 'CRR', value: m.crr?.toFixed(2), highlight: m.crr > m.rrr ? '#00E676' : '#FF4560' },
              { label: 'RRR', value: m.rrr?.toFixed(2) },
              { label: 'Target', value: m.target },
              { label: 'Need', value: m.need ? `${m.need} off ${m.ballsLeft}` : undefined },
            ].filter(s => s.value !== undefined).map((stat, i, arr) => (
              <div
                key={stat.label}
                style={{
                  flex: 1, padding: '10px 16px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid #2A2A42' : 'none',
                }}
              >
                <div style={{ fontSize: 10, color: '#8888AA', fontWeight: 600, marginBottom: 2 }}>{stat.label}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 700,
                  color: stat.highlight || '#FFFFFF',
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Sticky mini bar on scroll ────────────────────────── */}
      <AnimatePresence>
        {scrolled && isLive && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed', top: 60, left: 0, right: 0, zIndex: 900,
              padding: '0 20px',
            }}
          >
            <div style={{
              maxWidth: 1280, margin: '0 auto',
              background: 'rgba(16,16,30,0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #2A2A42', borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              padding: '8px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              height: 44,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <TeamBadge team={t1.short} size="sm" />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontSize: 13 }}>
                  {t1.score}/{t1.wickets}
                </span>
                <span style={{ color: '#8888AA', fontSize: 12 }}>vs</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', fontSize: 13 }}>
                  {t2.score}/{t2.wickets}
                </span>
                <TeamBadge team={t2.short} size="sm" />
              </div>
              <LiveBadge />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
