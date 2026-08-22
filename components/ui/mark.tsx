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
      stroke="var(--mark)"
      strokeWidth={10}
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
