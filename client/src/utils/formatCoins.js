// ═══════════════════════════════════════════════════════════
// utils/formatCoins.js — Coin display formatting
// ═══════════════════════════════════════════════════════════

/**
 * Format a coin amount with ₹ prefix and comma separators.
 * e.g. 12500 → "₹12,500"
 * @param {number} amount
 * @param {boolean} showSign — prefix + or - for delta values
 */
export function formatCoins(amount, showSign = false) {
  if (amount === null || amount === undefined) return '₹0';
  const abs = Math.abs(amount);
  const formatted = '₹' + abs.toLocaleString('en-IN');
  if (showSign) return (amount >= 0 ? '+' : '-') + formatted;
  return (amount < 0 ? '-' : '') + formatted;
}

/**
 * Format compact — large numbers shortened
 * e.g. 125000 → "₹1.25L"
 */
export function formatCoinsCompact(amount) {
  if (!amount) return '₹0';
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}
