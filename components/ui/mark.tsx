export function LedgerMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={size <= 16 ? 12 : size <= 24 ? 10 : size <= 32 ? 7 : 6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M56 44 H130" />
      <path d="M74 72 H130" />
      <path d="M30 102 H130" />
      <path d="M30 120 H130" />
    </svg>
  );
}

/** The Covenant Works mark. Always ink; never takes the signature color. */
export function CovenantMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={12}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M30 104 A50 50 0 0 1 130 104" />
      <path d="M22 126 H138" />
    </svg>
  );
}
