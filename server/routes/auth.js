// ═══════════════════════════════════════════════════════════
// routes/auth.js — Username Registration & Session
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

/**
 * POST /api/auth/register
 * Register a new user with a username.
 * Gives ₹10,000 starting balance.
 */
router.post('/register', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user with ₹10,000 starting balance
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: cleanUsername,
        balance: 10000,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Log initial bonus transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'bonus',
      amount: 10000,
      balance_after: 10000,
      description: 'Welcome bonus — ₹10,000 game coins',
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Auth register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login by username (no password — game only).
 */
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({ user });
  } catch (err) {
    console.error('Auth login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/daily-bonus
 * Claim daily ₹500 bonus (24hr cooldown).
 */
router.post('/daily-bonus', async (req, res) => {
  try {
    const { userId } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, balance, daily_bonus_claimed_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check 24hr cooldown
    if (user.daily_bonus_claimed_at) {
      const lastClaim = new Date(user.daily_bonus_claimed_at);
      const hoursSince = (Date.now() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return res.status(429).json({
          error: `Daily bonus already claimed. Come back in ${hoursLeft} hours.`,
        });
      }
    }

    const newBalance = user.balance + 500;

    await supabase
      .from('users')
      .update({
        balance: newBalance,
        daily_bonus_claimed_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'bonus',
      amount: 500,
      balance_after: newBalance,
      description: 'Daily login bonus — ₹500',
    });

    res.json({ newBalance, message: 'Daily bonus claimed! +₹500' });
  } catch (err) {
    console.error('Daily bonus error:', err.message);
    res.status(500).json({ error: 'Failed to claim bonus' });
  }
});

module.exports = router;
