// Ring geometry for the pie charts. Slices are separated by real gaps (the
// panel shows through) instead of a stroke in the surface color, which drew
// a heavy outline around every slice in dark mode.

/** Ring thickness as a share of the outer radius. */
export const DONUT_THICKNESS = 0.34;
/** Gap between slices, in viewBox units measured at the outer edge. */
export const DONUT_GAP = 2;

/**
 * One ring segment from fraction `from` to `to` (0-1, clockwise from 12
 * o'clock) in a `size` box. Each side gives up half the gap. A segment that
 * covers the whole ring is two half rings, since an SVG arc can't start and
 * end on the same point. Returns null when the segment is narrower than the gap.
 */
export function donutSegmentPath(
  from: number,
  to: number,
  size: number,
  { thickness = DONUT_THICKNESS, gap = DONUT_GAP }: { thickness?: number; gap?: number } = {},
): string | null {
  const c = size / 2;
  const r = size / 2;
  const inner = r * (1 - thickness);

  if (to - from >= 0.9999) {
    return [
      `M${c},${c - r}`,
      `A${r},${r} 0 1 1 ${c},${c + r}`,
      `A${r},${r} 0 1 1 ${c},${c - r}`,
      `M${c},${c - inner}`,
      `A${inner},${inner} 0 1 0 ${c},${c + inner}`,
      `A${inner},${inner} 0 1 0 ${c},${c - inner}`,
      "Z",
    ].join(" ");
  }

  const start = from * 2 * Math.PI;
  const end = to * 2 * Math.PI;
  // The same gap width at both radii, so the gap's sides stay parallel.
  const padOuter = gap / 2 / r;
  const padInner = gap / 2 / inner;
  if (end - start <= padInner * 2) return null;

  const point = (radius: number, a: number) =>
    `${round(c + radius * Math.sin(a))},${round(c - radius * Math.cos(a))}`;
  const outerStart = start + padOuter;
  const outerEnd = end - padOuter;
  const innerStart = start + padInner;
  const innerEnd = end - padInner;
  const largeOuter = outerEnd - outerStart > Math.PI ? 1 : 0;
  const largeInner = innerEnd - innerStart > Math.PI ? 1 : 0;

  return [
    `M${point(r, outerStart)}`,
    `A${r},${r} 0 ${largeOuter} 1 ${point(r, outerEnd)}`,
    `L${point(inner, innerEnd)}`,
    `A${inner},${inner} 0 ${largeInner} 0 ${point(inner, innerStart)}`,
    "Z",
  ].join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
