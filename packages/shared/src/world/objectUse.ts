const OBJECT_USED_PREFIX = 'object-used:';

export const objectUseFlag = (districtId: string, instanceId: string, interactionIndex: number): string =>
  `${OBJECT_USED_PREFIX}${districtId}:${instanceId}:${interactionIndex}`;

export const usedObjectsOf = (flags: readonly string[]): string[] => [
  ...new Set(
    flags
      .filter((flag) => flag.startsWith(OBJECT_USED_PREFIX))
      .map((flag) => flag.slice(OBJECT_USED_PREFIX.length).split(':').slice(1, -1).join(':'))
      .filter((instanceId) => instanceId.length > 0),
  ),
];
