// Ring geometry for the pie charts. Each slice is a stretch of one circle's
// stroke (stroke-dasharray), so the ring is a true circle with smooth edges
// and no outline or gap between slices.

/** Ring radius and stroke width in a 140 x 140 viewBox. */
export const RING = { size: 140, radius: 62, stroke: 12, activeStroke: 16 } as const;

/**
 * Each slice's own arc carries a hair past its end, under the next slice, so
 * antialiasing can't open a visible seam where two slices meet.
 */
const SEAM = 0.15;

export type RingArc = {
  /** Where the slice starts, 0-100, clockwise from 12 o'clock. */
  offset: number;
  /** How much of the ring it covers, 0-100. */
  length: number;
};

/** Arcs for slices in order, from their shares (0-1). */
export function ringArcs(shares: number[]): RingArc[] {
  let start = 0;
  return shares.map((share, i) => {
    const length = share * 100;
    const last = i === shares.length - 1;
    const arc = { offset: start, length: last ? length : Math.min(length + SEAM, 100 - start) };
    start += length;
    return arc;
  });
}

/** stroke-dasharray / stroke-dashoffset for an arc on a circle with pathLength 100. */
export function arcDash({ offset, length }: RingArc): { strokeDasharray: string; strokeDashoffset: number } {
  return { strokeDasharray: `${round(length)} ${round(100 - length)}`, strokeDashoffset: round(-offset) };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
