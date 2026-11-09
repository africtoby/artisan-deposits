// A tape-yellow square with three ink ticks, like a short piece of measuring tape. It is the
// favicon and sits beside the wordmark. Colors come from the tokens, never from hex values.
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="2" className="fill-tape" />
      <g className="stroke-ink" strokeWidth="2" strokeLinecap="butt">
        <line x1="6" y1="24" x2="6" y2="16" />
        <line x1="12" y1="24" x2="12" y2="10" />
        <line x1="18" y1="24" x2="18" y2="16" />
      </g>
    </svg>
  );
}
