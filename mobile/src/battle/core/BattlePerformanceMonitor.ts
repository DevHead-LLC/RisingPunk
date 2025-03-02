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
import { Platform } from 'react-native';

export interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  networkLatency: number;
  loadTime: number;
  jsThreadUsage: number;
  lastFrameTime: number;
}

export interface PerformanceLog {
  type: 'frame_drop' | 'memory_warning' | 'network_latency' | 'js_thread_warning' | 'load_time' | 'error';
  timestamp: number;
  details: {
    value: number;
    threshold?: number;
  };
}

type PerformanceSubscriber = (metrics: PerformanceMetrics) => void;

export class BattlePerformanceMonitor {
  private static instance: BattlePerformanceMonitor;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameRate: number = 60;
  private memoryUsage: number = 0;
  private networkLatency: number = 0;
  private loadStartTime: number = 0;
  private loadTime: number = 0;
  private jsThreadUsage: number = 0;
  private logs: PerformanceLog[] = [];
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private subscribers: Set<PerformanceSubscriber> = new Set();
  private lastMemoryCheck: number = 0;
  private memoryCheckInterval: number = 5000; // Check every 5 seconds
  private frameTimeHistory: number[] = [];
  private readonly maxHistoryLength = 60; // 1 second of frames at 60fps
  private readonly targetFrameTime = 16; // ~60fps

  private constructor() {}

  public static getInstance(): BattlePerformanceMonitor {
    if (!BattlePerformanceMonitor.instance) {
      BattlePerformanceMonitor.instance = new BattlePerformanceMonitor();
    }
    return BattlePerformanceMonitor.instance;
  }

  public startMonitoring(): void {
    this.isMonitoring = true;
    this.resetLogs();
    this.frameRate = 60;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.startFrameLoop();
    this.loadStartTime = performance.now();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startFrameLoop(): void {
    const frameLoop = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      this.frameCount++;

      if (now - this.lastFrameTime >= 1000) {
        this.frameRate = this.frameCount;
        if (this.frameRate < 55) {
          this.logs.push({
            type: 'frame_drop',
            timestamp: now,
            details: {
              value: this.frameRate,
              threshold: 55
            }
          });
        }
        this.frameCount = 0;
        this.lastFrameTime = now;
        this.notifySubscribers();
      }

      // Check memory usage periodically
      if (now - this.lastMemoryCheck >= this.memoryCheckInterval) {
        this.checkMemoryUsage();
        this.lastMemoryCheck = now;
      }

      this.animationFrameId = requestAnimationFrame(frameLoop);
    };

    this.animationFrameId = requestAnimationFrame(frameLoop);
  }

  public recordFrame(): void {
    if (!this.isMonitoring) return;
    this.frameCount++;
  }

  public checkMemoryUsage(): { usedJSHeapSize: number; jsHeapSizeLimit: number; usagePercentage: number } {
    if (Platform.OS === 'web' && performance.memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usagePercentage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      this.recordMemoryUsage(usagePercentage);
      return { usedJSHeapSize, jsHeapSizeLimit, usagePercentage };
    }
    return { usedJSHeapSize: 0, jsHeapSizeLimit: 0, usagePercentage: 0 };
  }

  public recordMemoryUsage(usage: number): void {
    if (!this.isMonitoring) return;
    this.memoryUsage = usage;
    if (usage > 80) {
      this.logs.push({
        type: 'memory_warning',
        timestamp: performance.now(),
        details: {
          value: usage,
          threshold: 80
        }
      });
      this.notifySubscribers();
    }
  }

  public recordNetworkLatency(latency: number): void {
    if (!this.isMonitoring) return;
    this.networkLatency = latency;
    if (latency > 200) {
      this.logs.push({
        type: 'network_latency',
        timestamp: performance.now(),
        details: {
          value: latency,
          threshold: 200
        }
      });
    }
    this.notifySubscribers();
  }

  public recordLoadStart(): void {
    this.loadStartTime = performance.now();
  }

  public recordLoadComplete(): void {
    if (!this.isMonitoring || !this.loadStartTime) return;
    const loadTime = performance.now() - this.loadStartTime;
    this.loadTime = loadTime;
    if (loadTime > 1000) {
      this.logs.push({
        type: 'load_time',
        timestamp: performance.now(),
        details: {
          value: loadTime,
          threshold: 1000
        }
      });
    }
    this.notifySubscribers();
  }

  public recordJSThreadUsage(usage: number): void {
    if (!this.isMonitoring) return;
    this.jsThreadUsage = usage;
    if (usage > 0.8) { // 80%
      this.logs.push({
        type: 'error',
        timestamp: performance.now(),
        details: {
          value: usage * 100,
          threshold: 80
        }
      });
    }
    this.notifySubscribers();
  }

  public subscribe(callback: PerformanceSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const metrics = this.getMetrics();
    this.subscribers.forEach(callback => callback(metrics));
  }

  public getMetrics(): PerformanceMetrics {
    return {
      frameRate: this.frameRate,
      memoryUsage: this.memoryUsage,
      networkLatency: this.networkLatency,
      loadTime: this.loadTime,
      jsThreadUsage: this.jsThreadUsage,
      lastFrameTime: this.frameTimeHistory[this.frameTimeHistory.length - 1] || 0
    };
  }

  public getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  private resetLogs(): void {
    this.frameRate = 60;
    this.memoryUsage = 0;
    this.networkLatency = 0;
    this.loadTime = 0;
    this.jsThreadUsage = 0;
    this.logs = [];
    this.loadStartTime = 0;
    this.lastMemoryCheck = 0;
    this.frameCount = 0;
    this.frameTimeHistory = [];
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.resetLogs();
    this.subscribers.clear();
  }

  recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }

    if (frameTime > this.targetFrameTime) {
      console.warn(`Frame time exceeded target: ${frameTime}ms > ${this.targetFrameTime}ms`);
    }
  }

  getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  isPerformanceOptimal(): boolean {
    return this.getAverageFrameTime() <= this.targetFrameTime;
  }

  reset(): void {
    this.frameTimeHistory = [];
  }
} 