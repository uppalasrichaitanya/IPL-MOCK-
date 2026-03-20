-- ═══════════════════════════════════════════════════════════
-- IPL 2026 Fantasy Betting — Supabase Schema Migration
-- Run this SQL in Supabase Dashboard → SQL Editor → New Query
-- Copy-paste the ENTIRE file and click "Run"
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- Table: users
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  balance       INTEGER NOT NULL DEFAULT 10000,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  daily_bonus_claimed_at TIMESTAMPTZ,
  total_bets    INTEGER NOT NULL DEFAULT 0,
  total_won     INTEGER NOT NULL DEFAULT 0,
  total_lost    INTEGER NOT NULL DEFAULT 0,
  win_streak    INTEGER NOT NULL DEFAULT 0,
  biggest_win   INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────
-- Table: bets
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id         TEXT NOT NULL,
  market_id        TEXT NOT NULL,
  market_name      TEXT NOT NULL,
  selection        TEXT NOT NULL,
  stake            INTEGER NOT NULL,
  odds_at_placement FLOAT NOT NULL,
  potential_return  INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  cash_out_value   INTEGER,
  profit_loss      INTEGER,
  settled_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- Table: transactions
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- Table: leaderboard_cache
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance      INTEGER NOT NULL DEFAULT 0,
  win_rate     FLOAT NOT NULL DEFAULT 0,
  roi          FLOAT NOT NULL DEFAULT 0,
  biggest_win  INTEGER NOT NULL DEFAULT 0,
  total_bets   INTEGER NOT NULL DEFAULT 0,
  rank         INTEGER,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_cache(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_balance ON leaderboard_cache(balance DESC);
