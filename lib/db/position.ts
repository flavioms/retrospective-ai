const GAP = 1000;

/**
 * Fractional index for inserting a card between two neighbors (either may be
 * absent at a column boundary), so reordering only ever touches the moved row.
 */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return GAP;
  if (prev === null) return (next as number) - GAP;
  if (next === null) return prev + GAP;
  return (prev + next) / 2;
}
