// ═══════════════════════════════════════════════════════════
// db/run-migration.js — Execute schema.sql against Supabase
// Uses Supabase's postgrest-compatible approach
// Usage: node db/run-migration.js
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function runMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('🚀 Running schema migration against Supabase...');
  console.log(`   URL: ${SUPABASE_URL}\n`);

  // Use Supabase's SQL execution endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log('⚠️  Direct SQL execution not available via REST API.');
    console.log('   This is normal for Supabase free tier.\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📋 MANUAL STEP REQUIRED:');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('1. Open your Supabase Dashboard:');
    console.log(`   ${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}`);
    console.log('');
    console.log('2. Go to: SQL Editor → New Query');
    console.log('');
    console.log('3. Copy-paste the following SQL and click "Run":');
    console.log('');
    console.log('─────────── COPY FROM HERE ───────────');
    console.log(sql);
    console.log('─────────── COPY UNTIL HERE ──────────');
    console.log('');
    console.log('4. After running, come back and run:');
    console.log('   node db/verify-tables.js');
    console.log('');
  } else {
    console.log('✅ Migration executed successfully!');
  }
}

runMigration().catch(console.error);
