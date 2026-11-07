export const COMPACT_LAYOUT_QUERY = '(max-width: 760px), (max-height: 520px)';

export const isCompactLayout = (): boolean => window.matchMedia(COMPACT_LAYOUT_QUERY).matches;

export const isCoarsePointer = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export const primaryGesture = (): string => (isCoarsePointer() ? 'Tap' : 'Click');

export const secondaryGesture = (): string => (isCoarsePointer() ? 'Hold' : 'Right-click');
