import { BattleTimerService } from '../src/services/BattleTimer';
import { BattlePhase } from '../src/types/battle';

describe('BattleTimer - 3-Second Countdown', () => {
  let timerService: BattleTimerService;
  const testBattleId = 'test-battle-123';

  beforeEach(() => {
    // Get singleton instance and reset for each test
    timerService = BattleTimerService.getInstance();
    timerService.stopAllTimers(); // Clean up any existing timers
    
    // Use fake timers for predictable testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up after each test
    timerService.stopAllTimers();
    jest.useRealTimers();
  });

  it('should display 3, 2, 1 countdown and then start battle phase', () => {
    const countdownEvents: Array<{countdown: number, phase: BattlePhase}> = [];
    const phaseChangeEvents: Array<{phase: BattlePhase, countdown: number}> = [];

    // Listen for countdown updates
    timerService.on('countdownUpdate', (data) => {
      if (data.battleId === testBattleId) {
        countdownEvents.push({
          countdown: data.countdown,
          phase: data.phase
        });
      }
    });

    // Listen for phase changes
    timerService.on('phaseChange', (data) => {
      if (data.battleId === testBattleId) {
        phaseChangeEvents.push({
          phase: data.phase,
          countdown: data.countdown
        });
      }
    });

    // Start the timer
    timerService.startTimer(testBattleId);

    // Verify timer is active
    expect(timerService.isTimerActive(testBattleId)).toBe(true);

    // Advance timer by 1 second - should emit 2 (user sees "2")
    jest.advanceTimersByTime(1000);
    expect(countdownEvents.length).toBe(1);
    expect(countdownEvents[0].countdown).toBe(2);

    // Advance timer by 1 second - should emit 1 (user sees "1")
    jest.advanceTimersByTime(1000);
    expect(countdownEvents.length).toBe(2);
    expect(countdownEvents[1].countdown).toBe(1);

    // Advance timer by 1 second - should emit 0 and trigger phase change (battle starts)
    jest.advanceTimersByTime(1000);
    expect(countdownEvents.length).toBe(3);
    expect(countdownEvents[2].countdown).toBe(0);
    
    // Verify phase change to ACTIVE (battle is now starting)
    expect(phaseChangeEvents.length).toBe(1);
    expect(phaseChangeEvents[0].phase).toBe(BattlePhase.ACTIVE);
    expect(phaseChangeEvents[0].countdown).toBe(0);

    // Verify timer is still active after countdown
    expect(timerService.isTimerActive(testBattleId)).toBe(true);
  });

  it('should emit countdown events for user-visible numbers: 2, 1', () => {
    const countdownEvents: number[] = [];

    timerService.on('countdownUpdate', (data) => {
      if (data.battleId === testBattleId) {
        countdownEvents.push(data.countdown);
      }
    });

    timerService.startTimer(testBattleId);

    // Advance 1 second - should have 2 (user sees "2")
    jest.advanceTimersByTime(1000);
    expect(countdownEvents).toContain(2);

    // Advance 1 more second - should have 2, 1 (user sees "1")
    jest.advanceTimersByTime(1000);
    expect(countdownEvents).toContain(1);

    // Advance 1 more second - should have 2, 1, 0 (battle starts)
    jest.advanceTimersByTime(1000);
    expect(countdownEvents).toContain(0);

    // Verify the user-visible countdown sequence: 2, 1 (0 triggers battle start)
    expect(countdownEvents).toEqual([2, 1, 0]);
  });
}); 