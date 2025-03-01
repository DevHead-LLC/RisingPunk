// Implementation of @battle-performance-standards.mdc#Core-Requirements
// Performance monitoring system for battle components

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

import { BattlePhase } from './BattleContext';

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  jsThreadUsage: number;
  lastUpdated: Date;
}

interface PerformanceLog {
  timestamp: Date;
  type: 'frame_drop' | 'memory_warning' | 'error';
  details: {
    value: number;
    threshold: number;
    cause?: string;
  };
}

export class BattlePerformanceMonitor {
  private static instance: BattlePerformanceMonitor;
  private metrics: PerformanceMetrics;
  private logs: PerformanceLog[];
  private frameRateInterval: NodeJS.Timeout | null;
  private memoryInterval: NodeJS.Timeout | null;
  private subscribers: Set<(metrics: PerformanceMetrics) => void>;
  private frameCount: number;
  private lastFrameTime: number;
  private isMonitoring: boolean;
  private lastMemoryWarning: number;
  private lastMemoryCheck: number;
  private lastFrameCheck: number;

  private constructor() {
    this.metrics = {
      frameRate: 60,
      memoryUsage: 0,
      jsThreadUsage: 0,
      lastUpdated: new Date()
    };
    this.logs = [];
    this.frameRateInterval = null;
    this.memoryInterval = null;
    this.subscribers = new Set();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.isMonitoring = false;
    this.lastMemoryWarning = 0;
    this.lastMemoryCheck = 0;
    this.lastFrameCheck = 0;
  }

  public static getInstance(): BattlePerformanceMonitor {
    if (!BattlePerformanceMonitor.instance) {
      BattlePerformanceMonitor.instance = new BattlePerformanceMonitor();
    }
    return BattlePerformanceMonitor.instance;
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.lastMemoryWarning = 0;
    this.lastMemoryCheck = 0;
    this.lastFrameCheck = 0;

    // Monitor frame rate every 1 second
    this.frameRateInterval = setInterval(() => {
      this.checkFrameRate();
    }, 1000);

    // Monitor memory usage every 5 seconds
    this.memoryInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);
  }

  private checkFrameRate(): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    if (currentTime - this.lastFrameCheck < 1000) return;
    this.lastFrameCheck = currentTime;

    const elapsed = currentTime - this.lastFrameTime;
    
    // Calculate FPS based on frame count and elapsed time
    const currentFPS = elapsed > 0 ? (this.frameCount * 1000) / elapsed : 60;
    this.metrics.frameRate = Math.min(Math.max(currentFPS, 0), 120); // Clamp between 0 and 120
    this.metrics.lastUpdated = new Date();

    // Log if frame rate drops below 55fps and we have recorded frames
    if (this.metrics.frameRate < 55 && this.frameCount > 0) {
      this.logs.push({
        timestamp: new Date(),
        type: 'frame_drop',
        details: {
          value: this.metrics.frameRate,
          threshold: 55,
          cause: 'Frame rate drop detected'
        }
      });
    }

    this.frameCount = 0;
    this.lastFrameTime = currentTime;
    this.notifySubscribers();
  }

  private checkMemoryUsage(): void {
    if (!this.isMonitoring || !performance.memory) return;

    const memoryInfo = performance.memory;
    const usedHeap = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
    this.metrics.memoryUsage = usedHeap;

    // Log if memory usage is above 80%
    if (usedHeap > 0.8) {
      const currentTime = performance.now();
      // Only log once every 5 seconds
      if (currentTime - this.lastMemoryWarning >= 5000) {
        this.lastMemoryWarning = currentTime;
        this.logs.push({
          timestamp: new Date(),
          type: 'memory_warning',
          details: {
            value: usedHeap * 100,
            threshold: 80,
            cause: 'High memory usage'
          }
        });
      }
    }
    this.notifySubscribers();
  }

  public stopMonitoring(): void {
    if (this.frameRateInterval) {
      clearInterval(this.frameRateInterval);
      this.frameRateInterval = null;
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    this.isMonitoring = false;
  }

  public recordFrame(): void {
    if (!this.isMonitoring) return;
    this.frameCount++;
  }

  public recordJSThreadUsage(usage: number): void {
    this.metrics.jsThreadUsage = usage;
    if (usage > 0.8) { // 80% threshold
      this.logs.push({
        timestamp: new Date(),
        type: 'error',
        details: {
          value: usage * 100,
          threshold: 80,
          cause: 'High JS thread usage'
        }
      });
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const metrics = this.getMetrics();
    this.subscribers.forEach(callback => callback(metrics));
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.subscribers.clear();
    this.logs = [];
    this.lastMemoryWarning = 0;
    this.lastMemoryCheck = 0;
    this.lastFrameCheck = 0;
    this.metrics = {
      frameRate: 60,
      memoryUsage: 0,
      jsThreadUsage: 0,
      lastUpdated: new Date()
    };
  }
} 