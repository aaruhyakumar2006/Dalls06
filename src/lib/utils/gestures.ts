// Detects horizontal swipe direction from touch start/end coordinates.
// Returns 'left', 'right', or null if below minDistance threshold.
export function detectSwipe(
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  minDistance = 50
): 'left' | 'right' | null {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  // Only consider swipes that are primarily horizontal
  if (Math.abs(deltaX) < minDistance || Math.abs(deltaY) > Math.abs(deltaX)) {
    return null;
  }

  return deltaX < 0 ? 'left' : 'right';
}

// Returns the pull-to-refresh distance (0 if below threshold, clamped at threshold*2).
// Used to drive a visual indicator: value / threshold gives 0-2 ratio.
export function detectPullToRefresh(
  startY: number,
  currentY: number,
  threshold = 80
): number {
  const distance = currentY - startY;

  if (distance < 0) {
    return 0;
  }

  // Clamp at threshold * 2
  return Math.min(distance, threshold * 2);
}

// Creates a debounced version of fn that only fires once per delay ms.
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
