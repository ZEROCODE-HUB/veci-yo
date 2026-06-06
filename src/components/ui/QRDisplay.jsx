import theme from '../../config/theme';

// Visual QR code placeholder – replace with a real QR library in production
export default function QRDisplay({ url, size = 180 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: size,
          height: size,
          background: '#000',
          borderRadius: theme.radius.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Simulated QR pattern */}
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          {/* Corner squares */}
          <rect x="10" y="10" width="55" height="55" fill="white"/>
          <rect x="17" y="17" width="41" height="41" fill="black"/>
          <rect x="24" y="24" width="27" height="27" fill="white"/>
          <rect x="135" y="10" width="55" height="55" fill="white"/>
          <rect x="142" y="17" width="41" height="41" fill="black"/>
          <rect x="149" y="24" width="27" height="27" fill="white"/>
          <rect x="10" y="135" width="55" height="55" fill="white"/>
          <rect x="17" y="142" width="41" height="41" fill="black"/>
          <rect x="24" y="149" width="27" height="27" fill="white"/>
          {/* Random data cells */}
          {Array.from({length: 14}).map((_, row) =>
            Array.from({length: 14}).map((_, col) => {
              const x = 72 + col * 9;
              const y = 72 + row * 9;
              const on = Math.sin(row * 3.7 + col * 2.1) > 0;
              if (!on) return null;
              return <rect key={`${row}-${col}`} x={x} y={y} width="8" height="8" fill="white"/>;
            })
          )}
          {Array.from({length: 7}).map((_, i) => (
            <rect key={`h${i}`} x={72 + i*18} y={10} width="8" height="8" fill="white"/>
          ))}
          {Array.from({length: 7}).map((_, i) => (
            <rect key={`v${i}`} x={10} y={72 + i*18} width="8" height="8" fill="white"/>
          ))}
        </svg>
      </div>

      {url && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.lg,
            padding: '10px 14px',
            gap: '10px',
            width: '100%',
          }}
        >
          <span style={{ flex: 1, fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {url}
          </span>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, flexShrink: 0 }}
            onClick={() => navigator.clipboard?.writeText(url)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
