// ═══════════════════════════════════════════════════════════
// db/migrate.js — Run schema migration against Supabase
// Usage: node db/migrate.js
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Individual CREATE TABLE statements (executed one at a time via RPC)
const tables = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
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
    );`,
  },
  {
    name: 'bets',
    sql: `CREATE TABLE IF NOT EXISTS bets (
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
    );`,
  },
  {
    name: 'transactions',
    sql: `CREATE TABLE IF NOT EXISTS transactions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type            TEXT NOT NULL,
      amount          INTEGER NOT NULL,
      balance_after   INTEGER NOT NULL,
      description     TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
  {
    name: 'leaderboard_cache',
    sql: `CREATE TABLE IF NOT EXISTS leaderboard_cache (
      user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance      INTEGER NOT NULL DEFAULT 0,
      win_rate     FLOAT NOT NULL DEFAULT 0,
      roi          FLOAT NOT NULL DEFAULT 0,
      biggest_win  INTEGER NOT NULL DEFAULT 0,
      total_bets   INTEGER NOT NULL DEFAULT 0,
      rank         INTEGER,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
];

async function runMigration() {
  console.log('🚀 Starting Supabase schema migration...\n');

  for (const table of tables) {
    console.log(`📝 Creating table: ${table.name}...`);
    const { error } = await supabase.rpc('exec_sql', { query: table.sql });
    if (error) {
      // RPC might not be available — the user may need to run SQL in dashboard
      console.warn(`   ⚠️  RPC exec_sql not available (expected on free tier).`);
      console.warn(`   📋 Copy the SQL below and run it in Supabase SQL Editor:\n`);
      console.log(table.sql);
      console.log('');
    } else {
      console.log(`   ✅ ${table.name} created successfully`);
    }
  }

  // Verify tables by attempting selects
  console.log('\n🔍 Verifying tables...\n');
  await verifyTables();
}

async function verifyTables() {
  const tableNames = ['users', 'bets', 'transactions', 'leaderboard_cache'];

  for (const name of tableNames) {
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ ${name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${name}: EXISTS (${data.length} rows)`);
    }
  }

  console.log('\n🏁 Migration verification complete.\n');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
