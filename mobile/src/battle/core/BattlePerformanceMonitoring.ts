import { Platform } from 'react-native';
import { BattleState } from './BattleTypes';

export class BattlePerformanceMonitoring {
  private static instance: BattlePerformanceMonitoring;
  private isMonitoring: boolean = false;
  private memoryWarningThreshold: number = 80;
  private networkLatencyThreshold: number = 200;

  private constructor() {}

  public static getInstance(): BattlePerformanceMonitoring {
    if (!BattlePerformanceMonitoring.instance) {
      BattlePerformanceMonitoring.instance = new BattlePerformanceMonitoring();
    }
    return BattlePerformanceMonitoring.instance;
  }

  public start(): void {
    this.isMonitoring = true;
  }

  public stop(): void {
    this.isMonitoring = false;
  }

  public startMonitoring(): void {
    this.isMonitoring = true;
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
  }

  public checkMemoryUsage(usagePercentage: number = 0): void {
    if (!this.isMonitoring) return;

    if (usagePercentage > 80) {
      console.warn(`High memory usage: ${usagePercentage}%`);
    }
  }

  public async recordNetworkLatency(latency?: number): Promise<number> {
    if (!this.isMonitoring) return 0;

    let actualLatency: number;

    if (latency !== undefined) {
      actualLatency = latency;
    } else {
      const startTime = performance.now();
      // Simulate network request for testing
      await new Promise(resolve => setTimeout(resolve, 50));
      actualLatency = performance.now() - startTime;
    }

    if (actualLatency > this.networkLatencyThreshold) {
      console.warn(`High network latency: ${actualLatency}ms`);
    }

    return actualLatency;
  }

  public cleanup(): void {
    this.isMonitoring = false;
  }

  public async measureSyncDuration(): Promise<number> {
    if (!this.isMonitoring) return 0;

    const startTime = performance.now();
    // Simulate sync operation for testing
    await new Promise(resolve => setTimeout(resolve, 50));
    return performance.now() - startTime;
  }

  public async measureBatchUpdates(updates: Partial<BattleState>[]): Promise<number> {
    if (!this.isMonitoring) return 0;

    const startTime = performance.now();
    // Process each update with a small delay
    await Promise.all(updates.map(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    }));
    return performance.now() - startTime;
  }
} 