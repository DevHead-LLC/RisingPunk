import { BattleTimerService } from '../src/services/BattleTimer';
import { BattlePhase } from '../src/types/battle';

describe('BattleTimer - 3-Second Countdown', () => {
  let timerService: BattleTimerService;
  const testBattleId = 'test-battle-123';

  beforeEach(() => {
    jest.useFakeTimers();
    timerService = BattleTimerService.getInstance();
    timerService.removeAllListeners();
  });

  afterEach(() => {
    timerService.stopTimer(testBattleId);
    jest.useRealTimers();
  });

  it('should display 3, 2, 1 countdown and then start battle phase', () => {
    const countdownEvents: any[] = [];
    const phaseChangeEvents: any[] = [];

    timerService.on('countdownUpdate', (data) => {
      countdownEvents.push(data);
    });

    timerService.on('phaseChange', (data) => {
      phaseChangeEvents.push(data);
    });

    timerService.startTimer(testBattleId);

    // Advance through countdown: 3, 2, 1
    jest.advanceTimersByTime(1000);
    expect(countdownEvents[0].countdown).toBe(2);

    jest.advanceTimersByTime(1000);
    expect(countdownEvents[1].countdown).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(countdownEvents[2].countdown).toBe(0);

    // Should transition to battle phase
    expect(phaseChangeEvents.length).toBeGreaterThan(0);
    expect(phaseChangeEvents[0].phase).toBe(BattlePhase.ACTIVE);
  });

  it('should emit countdown events for user-visible numbers: 2, 1', () => {
    const countdownEvents: any[] = [];

    timerService.on('countdownUpdate', (data) => {
      countdownEvents.push(data);
    });

    timerService.startTimer(testBattleId);

    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(1000);

    expect(countdownEvents.length).toBe(2);
    expect(countdownEvents[0].countdown).toBe(2);
    expect(countdownEvents[1].countdown).toBe(1);
  });

  it('should verify 45-second battle duration configuration', () => {
    const timer = timerService.getTimeRemaining(testBattleId);
    expect(timer).toBeNull();

    timerService.startTimer(testBattleId);
    jest.advanceTimersByTime(3000); // Skip countdown

    expect(timerService.isTimerActive(testBattleId)).toBe(true);

    jest.advanceTimersByTime(20000); // Advance 20 seconds into battle
    expect(timerService.isTimerActive(testBattleId)).toBe(true);

    jest.advanceTimersByTime(25000); // Advance 25 more seconds (total 45 battle seconds)
    expect(timerService.isTimerActive(testBattleId)).toBe(false);
  });
});

describe('BattleTimer - Server-Client Coordination', () => {
  let timerService: BattleTimerService;
  const testBattleId = 'test-battle-123';

  beforeEach(() => {
    jest.useFakeTimers();
    timerService = BattleTimerService.getInstance();
    timerService.removeAllListeners();
  });

  afterEach(() => {
    timerService.stopTimer(testBattleId);
    jest.useRealTimers();
  });

  it('should send correct timeRemaining values to client during battle phase', () => {
    const timer = timerService.getTimeRemaining(testBattleId);
    expect(timer).toBeNull();

    timerService.startTimer(testBattleId);
    
    // Skip countdown phase (3 seconds)
    jest.advanceTimersByTime(3000);
    
    // Check that battle phase has started
    const timerState = timerService.getTimeRemaining(testBattleId);
    expect(timerState).toBeTruthy();
    expect(timerState!.phase).toBe(BattlePhase.ACTIVE);
    expect(timerState!.battleTime).toBe(0);
    
    // Advance 10 seconds into battle
    jest.advanceTimersByTime(10000);
    const timerStateAfter10 = timerService.getTimeRemaining(testBattleId);
    expect(timerStateAfter10!.battleTime).toBe(10);
    
    // Advance 20 more seconds (30 total)
    jest.advanceTimersByTime(20000);
    const timerStateAfter30 = timerService.getTimeRemaining(testBattleId);
    expect(timerStateAfter30!.battleTime).toBe(30);
    
    // Advance 15 more seconds (45 total) - battle should end
    jest.advanceTimersByTime(15000);
    const timerStateAfter45 = timerService.getTimeRemaining(testBattleId);
    expect(timerStateAfter45).toBeNull(); // Timer should be cleaned up
  });

  it('should emit battleTimeUpdate events with correct timeRemaining values', () => {
    const events: any[] = [];
    
    timerService.on('battleTimeUpdate', (data) => {
      events.push(data);
    });

    timerService.startTimer(testBattleId);
    jest.advanceTimersByTime(3000); // Skip countdown
    
    // Advance 5 seconds into battle
    jest.advanceTimersByTime(5000);
    
    expect(events.length).toBeGreaterThan(0);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.battleTime).toBe(5);
    expect(lastEvent.timeRemaining).toBe(40); // 45 - 5 = 40
  });
}); 