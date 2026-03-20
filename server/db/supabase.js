// ═══════════════════════════════════════════════════════════
// db/supabase.js — Supabase Client Initialization
// ═══════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey &&
    supabaseUrl !== 'your_supabase_url' &&
    supabaseKey !== 'your_supabase_anon_key') {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase not configured — set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  console.warn('   Database operations will return mock data until configured.');

  // Provide a mock Supabase client so routes don't crash
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: { message: 'Supabase not configured' } }), data: [], error: null }), order: () => ({ limit: () => ({ data: [], error: null }), range: () => ({ data: [], count: 0, error: null }) }), gt: () => ({ data: [], count: 0, error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: 'Supabase not configured' } }) }), data: null, error: { message: 'Supabase not configured' } }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null }),
    }),
  };
}

module.exports = { supabase };
