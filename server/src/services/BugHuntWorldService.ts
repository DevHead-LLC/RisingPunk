const RESEED_GRID_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

type BugHuntWorldState = {
  reseedInProgress: boolean;
  nextAntWorldReseedAtUtc: Date;
  updatedAt: Date;
};

let worldState: BugHuntWorldState = {
  reseedInProgress: false,
  nextAntWorldReseedAtUtc: computeNextUtcGridInstant(new Date()),
  updatedAt: new Date(),
};

export function computeNextUtcGridInstant(now: Date): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const second = now.getUTCSeconds();
  const millisecond = now.getUTCMilliseconds();

  const nextHour = RESEED_GRID_HOURS.find((h) => h > hour);
  const exactOnGrid =
    RESEED_GRID_HOURS.includes(hour as (typeof RESEED_GRID_HOURS)[number]) &&
    minute === 0 &&
    second === 0 &&
    millisecond === 0;

  if (exactOnGrid) {
    return new Date(Date.UTC(y, m, d, hour + 3, 0, 0, 0));
  }
  if (nextHour !== undefined) {
    return new Date(Date.UTC(y, m, d, nextHour, 0, 0, 0));
  }
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
}

export function getBugHuntWorldStateSnapshot(): BugHuntWorldState {
  return {
    reseedInProgress: worldState.reseedInProgress,
    nextAntWorldReseedAtUtc: new Date(worldState.nextAntWorldReseedAtUtc.getTime()),
    updatedAt: new Date(worldState.updatedAt.getTime()),
  };
}

export function markBugHuntReseedInProgress(inProgress: boolean): void {
  worldState = {
    ...worldState,
    reseedInProgress: inProgress,
    updatedAt: new Date(),
  };
}

export function setNextAntWorldReseedAtUtc(nextAntWorldReseedAtUtc: Date): void {
  worldState = {
    ...worldState,
    nextAntWorldReseedAtUtc,
    updatedAt: new Date(),
  };
}

export function refreshNextAntWorldReseedAtUtc(now: Date = new Date()): void {
  worldState = {
    ...worldState,
    nextAntWorldReseedAtUtc: computeNextUtcGridInstant(now),
    updatedAt: new Date(),
  };
}
