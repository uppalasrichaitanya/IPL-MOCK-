// ═══════════════════════════════════════════════════════════
// utils/oddsDisplay.js — Odds format conversion helpers
// ═══════════════════════════════════════════════════════════

/**
 * Format decimal odds for display (2 decimal places).
 * @param {number} odds — decimal, e.g. 2.45
 * @returns {string} "2.45"
 */
export function formatDecimal(odds) {
  if (!odds || odds <= 0) return '—';
  return parseFloat(odds).toFixed(2);
}

/**
 * Convert decimal odds to fractional string.
 * e.g. 2.5 → "3/2", 3.0 → "2/1"
 * @param {number} decimal
 * @returns {string} "3/2"
 */
export function decimalToFractional(decimal) {
  if (!decimal || decimal <= 1) return '—';

  const profit = decimal - 1;
  // Find simple fraction using GCD
  const precision = 100;
  const numerator   = Math.round(profit * precision);
  const denominator = precision;
  const gcd = getGcd(numerator, denominator);
  return `${numerator / gcd}/${denominator / gcd}`;
}

/**
 * Convert decimal odds to American moneyline.
 * Favourite (< 2.0) → negative, Underdog (>= 2.0) → positive
 * @param {number} decimal
 * @returns {string} "+250" or "-200"
 */
export function decimalToAmerican(decimal) {
  if (!decimal || decimal <= 1) return '—';
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`;
  }
  return `${Math.round(-100 / (decimal - 1))}`;
}

/**
 * Get the implied probability % from decimal odds.
 * @param {number} decimal
 * @returns {string} "40.8%"
 */
export function impliedProbability(decimal) {
  if (!decimal || decimal <= 0) return '0%';
  return ((1 / decimal) * 100).toFixed(1) + '%';
}

/**
 * Format odds in the user's preferred format.
 * @param {number} decimal
 * @param {'decimal'|'fractional'|'american'} format
 * @returns {string}
 */
export function formatOdds(decimal, format = 'decimal') {
  switch (format) {
    case 'fractional': return decimalToFractional(decimal);
    case 'american':   return decimalToAmerican(decimal);
    default:           return formatDecimal(decimal);
  }
}

// ── Helpers ────────────────────────────────────────────────
function getGcd(a, b) {
  return b === 0 ? a : getGcd(b, a % b);
}
