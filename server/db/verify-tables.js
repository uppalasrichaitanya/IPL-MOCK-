// ═══════════════════════════════════════════════════════════
// db/verify-tables.js — Verify all 4 tables exist in Supabase
// Usage: node db/verify-tables.js
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const TABLES = ['users', 'bets', 'transactions', 'leaderboard_cache'];

async function verifyTables() {
  console.log('🔍 Verifying Supabase tables...\n');

  let allOk = true;

  for (const table of TABLES) {
    try {
      const { data, error, status } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      if (error) {
        console.log(`   ❌ ${table}: MISSING — ${error.message}`);
        allOk = false;
      } else {
        console.log(`   ✅ ${table}: EXISTS`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ERROR — ${err.message}`);
      allOk = false;
    }
  }

  console.log('');
  if (allOk) {
    console.log('🎉 All 4 tables verified! Schema migration successful.');
    console.log('   You can now proceed to Phase 2.');
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL in Supabase SQL Editor.');
    console.log('   See: server/db/schema.sql');
  }
}

verifyTables().catch(console.error);
