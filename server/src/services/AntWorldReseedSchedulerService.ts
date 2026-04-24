import { computeNextUtcGridInstant } from './BugHuntWorldService';
import { runAntWorldReseedWithLease } from './AntWorldReseedService';

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;

function clearSchedulerTimer(): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}

function scheduleNextTick(): void {
  clearSchedulerTimer();
  const now = new Date();
  const nextTickUtc = computeNextUtcGridInstant(now);
  const delayMs = Math.max(0, nextTickUtc.getTime() - now.getTime());
  schedulerTimer = setTimeout(() => {
    schedulerTimer = null;
    void runAntWorldReseedWithLease('scheduler')
      .catch((error) => {
        console.error('[AntWorldReseedScheduler] reseed tick failed:', error);
      })
      .finally(() => {
        scheduleNextTick();
      });
  }, delayMs);
}

export function startAntWorldReseedScheduler(): void {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;
  scheduleNextTick();
}

