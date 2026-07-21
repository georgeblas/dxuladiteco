export function Greca({ color, id }) {
  const pid = "greca-" + id;
  return (
    <svg width="100%" height="14" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <pattern id={pid} width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 12 H6 V4 H14 V12 H22 V4 H28 V12" fill="none" stroke={color} strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill={`url(#${pid})`} />
    </svg>
  );
}

export function CacaoIcon({ size = 44, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="26" rx="13" ry="18" stroke={color} strokeWidth="2.5" />
      <path d="M24 8 C24 8 24 44 24 44" stroke={color} strokeWidth="2" />
      <path d="M14 16 C18 20 30 20 34 16 M12 26 C17 30 31 30 36 26 M14 36 C18 32 30 32 34 36" stroke={color} strokeWidth="1.6" />
      <path d="M24 8 C26 4 30 3 32 4 C31 7 27 9 24 8Z" fill={color} />
    </svg>
  );
}

export function BagIcon({ count, color, accent }) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 8 h14 l-1.2 12 a1.8 1.8 0 0 1 -1.8 1.6 H8 a1.8 1.8 0 0 1 -1.8 -1.6 Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8.5 8 V7 a3.5 3.5 0 0 1 7 0 v1" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span style={{ position: "absolute", top: 11, left: 0, right: 0, textAlign: "center", fontSize: 11, fontWeight: 700, color: accent }}>{count}</span>
    </span>
  );
}

export function WhatsIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 a9 9 0 0 0 -7.8 13.5 L3 21 l4.6 -1.2 A9 9 0 1 0 12 3 Z" fill="#25D366" />
      <path d="M9.2 8.1 c.2 -.5 .5 -.5 .8 -.5 h.5 c.2 0 .4 0 .5 .4 l.7 1.6 c.1 .2 0 .4 -.1 .5 l-.5 .6 c-.1 .2 -.2 .3 0 .6 a6 6 0 0 0 2.7 2.6 c.3 .1 .4 .1 .6 -.1 l.7 -.8 c.2 -.2 .3 -.2 .6 -.1 l1.6 .8 c.3 .1 .4 .2 .4 .4 0 .8 -.5 1.7 -1.3 1.9 -.7 .2 -1.6 .3 -3.4 -.6 a10.4 10.4 0 0 1 -3.9 -3.6 c-.7 -1.1 -.9 -2.2 -.7 -3 .1 -.4 .4 -.6 .8 -.7 Z" fill="#FFFFFF" />
    </svg>
  );
}
