// ═══════════════════════════════════════════════════════════
// components/ResponsibleGamingFooter.jsx
// Sticky bottom bar — always visible on all pages
// ═══════════════════════════════════════════════════════════

export default function ResponsibleGamingFooter() {
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#10101E',
        borderTop: '1px solid #2A2A42',
        zIndex: 9998,
      }}
    >
      <p style={{ color: '#8888AA', fontSize: 12, margin: 0 }}>
        🎮 Game coins only — no real money. Play responsibly.
      </p>
    </footer>
  );
}
