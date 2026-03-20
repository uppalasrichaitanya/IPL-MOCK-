// ═══════════════════════════════════════════════════════════
// components/TeamBadge.jsx — Team logo or initials badge
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TEAMS } from '../config/teams';

const SIZES = {
  sm: { px: 32, text: 'text-xs' },
  md: { px: 48, text: 'text-sm' },
  lg: { px: 64, text: 'text-lg' },
};

export default function TeamBadge({ team = '', logoUrl = '', size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  const teamInfo = TEAMS[team?.toUpperCase()] || {};
  const bg       = teamInfo.color || '#6C63FF';
  const abbr     = teamInfo.short || (team?.slice(0, 2).toUpperCase()) || '??';
  const { px, text } = SIZES[size] || SIZES.md;

  const sharedStyle = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const showImg = logoUrl && !imgError;

  return (
    <motion.div
      style={sharedStyle}
      whileHover={{ scale: 1.08 }}
      transition={{ duration: 0.15 }}
      title={teamInfo.name || team}
    >
      {showImg ? (
        <img
          src={logoUrl}
          alt={abbr}
          style={{ ...sharedStyle, objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          style={{
            ...sharedStyle,
            background: bg,
            border: '2px solid rgba(255,255,255,0.15)',
          }}
          className={`${text} font-bold text-white select-none`}
        >
          {abbr}
        </div>
      )}
    </motion.div>
  );
}
