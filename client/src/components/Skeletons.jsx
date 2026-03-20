// ═══════════════════════════════════════════════════════════
// components/ScoreboardSkeleton.jsx — Scoreboard loading state
// ═══════════════════════════════════════════════════════════

export function ScoreboardSkeleton() {
  const P = ({ w = '100%', h = 16, r = 8, style = {} }) => (
    <div
      style={{
        width: w, height: h, borderRadius: r,
        background: 'linear-gradient(90deg, #1A1A2E 25%, #2A2A42 50%, #1A1A2E 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );

  return (
    <div
      style={{
        background: '#10101E', border: '1px solid #2A2A42',
        borderRadius: 20, overflow: 'hidden', marginBottom: 24,
      }}
    >
      {/* Top bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #2A2A42', display: 'flex', justifyContent: 'space-between' }}>
        <P w={60} h={14} />
        <P w={100} h={14} />
      </div>

      {/* Scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, padding: '20px 24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <P w={48} h={48} r={24} />
            <P w={80} h={14} />
          </div>
          <P w={120} h={40} r={6} />
        </div>
        <P w={24} h={14} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <P w={80} h={14} />
            <P w={48} h={48} r={24} />
          </div>
          <P w={120} h={40} r={6} />
        </div>
      </div>

      {/* Batters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #2A2A42' }}>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <P w={30} h={10} />
          <P w='90%' h={14} />
          <P w='70%' h={14} />
        </div>
        <div style={{ padding: '14px 20px', borderLeft: '1px solid #2A2A42', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <P w={40} h={10} />
          <P w='80%' h={14} />
        </div>
      </div>

      {/* Run rates */}
      <div style={{ display: 'flex', borderTop: '1px solid #2A2A42' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, padding: '10px 16px', textAlign: 'center', borderRight: i < 4 ? '1px solid #2A2A42' : 'none' }}>
            <P w='60%' h={10} style={{ margin: '0 auto 6px' }} />
            <P w='80%' h={16} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchCardSkeleton() {
  const P = ({ w = '100%', h = 14, r = 6 }) => (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #1A1A2E 25%, #2A2A42 50%, #1A1A2E 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );

  return (
    <div style={{ background: '#10101E', border: '1px solid #2A2A42', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <P w={40} h={40} r={20} />
          <P w={80} h={14} />
        </div>
        <P w={20} h={12} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <P w={80} h={14} />
          <P w={40} h={40} r={20} />
        </div>
      </div>
      <P h={24} />
      <P w='60%' h={12} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <P h={40} r={10} />
        <P h={40} r={10} />
      </div>
    </div>
  );
}

export function OddsCardSkeleton() {
  const P = ({ w = '100%', h = 14, r = 6 }) => (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #1A1A2E 25%, #2A2A42 50%, #1A1A2E 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
  return (
    <div style={{ background: '#10101E', border: '1px solid #2A2A42', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <P w='50%' h={12} />
      <div style={{ display: 'flex', gap: 8 }}>
        <P h={44} r={10} />
        <P h={44} r={10} />
      </div>
    </div>
  );
}
