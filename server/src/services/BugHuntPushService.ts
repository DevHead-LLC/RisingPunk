import { EventEmitter } from 'events';

type BugHpEvent = {
  bugInstanceId: string;
  hpPercent: number;
  seq: number;
};

const bugHuntEmitter = new EventEmitter();
const BUG_HP_EVENT = 'bug-hp-update';

export function publishBugHpUpdate(event: BugHpEvent): void {
  bugHuntEmitter.emit(BUG_HP_EVENT, event);
}

export function subscribeBugHpUpdates(handler: (event: BugHpEvent) => void): () => void {
  bugHuntEmitter.on(BUG_HP_EVENT, handler);
  return () => {
    bugHuntEmitter.off(BUG_HP_EVENT, handler);
  };
}
