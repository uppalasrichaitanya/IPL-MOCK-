// ═══════════════════════════════════════════════════════════
// pages/Match.jsx — Full live match page with markets + betslip
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

import Scoreboard from '../components/Scoreboard';
import { ScoreboardSkeleton, OddsCardSkeleton } from '../components/Skeletons';
import OddsCard from '../components/OddsCard';
import BetSlip from '../components/BetSlip';
import ActiveBets from '../components/ActiveBets';
import useMatchStore from '../store/useMatchStore';
import { useLiveScore } from '../hooks/useLiveScore';
import { useOdds } from '../hooks/useOdds';

// ═══════════════════════════════════════════════════════════
// 26 Market definitions — grouped by category
// ═══════════════════════════════════════════════════════════
const MARKET_GROUPS = [
  {
    name: 'Pre-Match',
    icon: '🏏',
    markets: [
      { id: 'match_winner',      label: 'Match Winner',          sels: 2, lockOvers: 0 },
      { id: 'toss_winner',       label: 'Toss Winner',           sels: 2, lockOvers: 0 },
      { id: 'first_innings_runs', label: 'First Innings Total',  sels: 3, lockOvers: 0 },
    ],
  },
  {
    name: 'Powerplay',
    icon: '⚡',
    markets: [
      { id: 'pp_runs',           label: 'Powerplay Runs (O/U)',  sels: 2, lockOvers: 1 },
      { id: 'pp_wickets',        label: 'Powerplay Wickets',     sels: 3, lockOvers: 1 },
      { id: 'pp_boundaries',     label: 'Powerplay Boundaries',  sels: 2, lockOvers: 1 },
    ],
  },
  {
    name: 'Over by Over',
    icon: '🎯',
    markets: [
      { id: 'next_over_runs',    label: 'Next Over Runs (O/U)',  sels: 2, lockSec: 15 },
      { id: 'next_ball_outcome', label: 'Next Ball Outcome',     sels: 5, lockSec: 15 },
      { id: 'batsman_next_runs', label: 'Batsman Next Over Runs', sels: 3, lockSec: 15 },
      { id: 'over_total_exact',  label: 'Exact Over Total',      sels: 4, lockSec: 15 },
    ],
  },
  {
    name: 'Innings Markets',
    icon: '📊',
    markets: [
      { id: 'top_batsman',       label: 'Top Batsman',           sels: 4, lockOvers: 5 },
      { id: 'top_bowler',        label: 'Top Bowler (Wickets)',   sels: 4, lockOvers: 5 },
      { id: 'total_sixes',       label: 'Total Sixes (O/U)',     sels: 2, lockOvers: 5 },
      { id: 'total_fours',       label: 'Total Fours (O/U)',     sels: 2, lockOvers: 5 },
      { id: 'highest_scoring_over', label: 'Highest Scoring Over', sels: 3, lockOvers: 10 },
      { id: 'total_extras',      label: 'Total Extras (O/U)',    sels: 2, lockOvers: 5 },
      { id: 'fall_of_first_wkt', label: 'Fall of 1st Wicket',    sels: 3, lockOvers: 1 },
      { id: 'fifty_scored',      label: 'Fifty Scored?',         sels: 2, lockOvers: 5 },
      { id: 'century_scored',    label: 'Century Scored?',       sels: 2, lockOvers: 10 },
      { id: 'method_of_next_wkt', label: 'Method of Next Wicket', sels: 4, lockSec: 15 },
    ],
  },
  {
    name: 'Live In-Play',
    icon: '🔴',
    markets: [
      { id: 'win_probability',   label: 'Live Win Probability',  sels: 2, lockOvers: null },
      { id: 'run_chase_success', label: 'Run Chase Success',     sels: 2, lockOvers: null },
      { id: 'next_boundary',     label: 'Next Boundary Type',    sels: 3, lockSec: 15 },
      { id: 'runs_in_last5',     label: 'Runs in Last 5 Overs',  sels: 2, lockOvers: null },
      { id: 'wicket_next_over',  label: 'Wicket in Next Over?',  sels: 2, lockSec: 15 },
      { id: 'dot_ball_pct',      label: 'Dot Ball % (O/U)',      sels: 2, lockOvers: null },
      { id: 'dls_par',           label: 'DLS Par Score Market',   sels: 2, lockOvers: null },
      { id: 'partnership_runs',  label: 'Current Partnership Runs', sels: 5, lockOvers: null },
      { id: 'team_score_ov10',   label: 'Team Score at Over 10',  sels: 4, lockOvers: 10 },
    ],
  },
];

// ── Generate dynamic selections for a market ──────────────
function generateSelections(market, currentMatch, allOdds) {
  const stored = allOdds?.[market.id];
  if (stored && Array.isArray(stored)) return stored;

  const t1 = currentMatch?.team1?.name || 'Team A';
  const t2 = currentMatch?.team2?.name || 'Team B';

  // Defaults based on market
  switch (market.sels) {
    case 2: return [
      { id: `${market.id}_1`, label: t1, odds: null },
      { id: `${market.id}_2`, label: t2, odds: null },
    ];
    case 3: return [
      { id: `${market.id}_1`, label: 'Under', odds: null },
      { id: `${market.id}_2`, label: 'Over',  odds: null },
      { id: `${market.id}_3`, label: 'Mid',   odds: null },
    ];
    case 4: return [
      { id: `${market.id}_1`, label: 'Option A', odds: null },
      { id: `${market.id}_2`, label: 'Option B', odds: null },
      { id: `${market.id}_3`, label: 'Option C', odds: null },
      { id: `${market.id}_4`, label: 'Option D', odds: null },
    ];
    case 5: return [
      { id: `${market.id}_dot`,  label: 'Dot',  odds: null },
      { id: `${market.id}_1`,    label: '1',    odds: null },
      { id: `${market.id}_2`,    label: '2-3',  odds: null },
      { id: `${market.id}_4`,    label: '4',    odds: null },
      { id: `${market.id}_6wkt`, label: '6/W',  odds: null },
    ];
    default: return [];
  }
}

// ── Collapsible market group ──────────────────────────────
function MarketGroup({ group, currentMatch, allOdds, oddsMovement, currentOvers }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Group header */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(108,99,255,0.06)',
          border: '1px solid #2A2A42',
          borderRadius: 12,
          padding: '10px 16px',
          cursor: 'pointer',
          marginBottom: collapsed ? 0 : 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{group.icon}</span>
          <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>{group.name}</span>
          <span style={{
            background: '#1A1A2E', border: '1px solid #2A2A42',
            borderRadius: 10, padding: '1px 8px',
            color: '#8888AA', fontSize: 11,
          }}>
            {group.markets.length}
          </span>
        </div>
        {collapsed ? <ChevronDown size={16} color="#8888AA" /> : <ChevronUp size={16} color="#8888AA" />}
      </motion.button>

      {/* Markets */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {group.markets.map((market) => {
              const sels      = generateSelections(market, currentMatch, allOdds);
              const lockTime  = getLockTime(market, currentOvers);
              const isLocked  = lockTime !== null && lockTime <= 0;

              // Attach movement
              const withMovement = sels.map((s) => ({
                ...s,
                movement: oddsMovement?.[s.id] || null,
              }));

              return (
                <OddsCard
                  key={market.id}
                  marketId={market.id}
                  marketName={market.label}
                  selections={withMovement}
                  lockTime={lockTime > 0 ? lockTime : null}
                  isLocked={isLocked}
                  matchId={currentMatch?.id || ''}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Calculate lock seconds remaining ──────────────────────
function getLockTime(market, currentOvers) {
  if (market.lockSec) return market.lockSec; // Always shows countdown for ball-by-ball
  if (market.lockOvers === null) return null; // Always open
  if (market.lockOvers === 0 && currentOvers > 0.1) return 0; // Pre-match locked after start
  if (currentOvers === undefined || currentOvers === null) return null;
  const oversRemaining = market.lockOvers - currentOvers;
  if (oversRemaining <= 0) return 0;
  return Math.max(0, Math.round(oversRemaining * 36)); // ~36s per over approximation
}

// ── Use media query for mobile detection ──────────────────
function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return mobile;
}

// ═══════════════════════════════════════════════════════════
// Match page
// ═══════════════════════════════════════════════════════════
export default function Match() {
  const { id }          = useParams();
  const { isConnected } = useLiveScore();
  const currentMatch    = useMatchStore((s) => s.currentMatch);
  const allOdds         = useMatchStore((s) => s.allOdds);
  const isLive          = useMatchStore((s) => s.isLive);
  const isMobile        = useIsMobile();

  // Odds movement tracking
  const oddsMovement = useOdds();

  const currentOvers = useMemo(() => {
    // Get batting team's overs from currentMatch
    const t1 = currentMatch?.team1;
    const t2 = currentMatch?.team2;
    return t1?.overs || t2?.overs || 0;
  }, [currentMatch]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        maxWidth: 1360,
        margin: '0 auto',
        padding: '20px 16px 80px',
      }}
    >
      {/* Scoreboard */}
      {!isConnected ? <ScoreboardSkeleton /> : <Scoreboard />}

      {/* Two-column desktop / single-column mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* ── Left: Market groups ────────────────────────── */}
        <div>
          {isConnected ? (
            MARKET_GROUPS.map((group) => (
              <MarketGroup
                key={group.name}
                group={group}
                currentMatch={currentMatch}
                allOdds={allOdds}
                oddsMovement={oddsMovement}
                currentOvers={currentOvers}
              />
            ))
          ) : (
            /* Skeleton loading */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <OddsCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: BetSlip + ActiveBets (desktop) ─────── */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <BetSlip isMobile={false} />
            <ActiveBets />
          </div>
        )}
      </div>

      {/* ── Mobile: BetSlip as drawer + ActiveBets inline ── */}
      {isMobile && (
        <>
          <div style={{ marginTop: 24 }}>
            <ActiveBets />
          </div>
          <BetSlip isMobile={true} />
        </>
      )}
    </motion.div>
  );
}
