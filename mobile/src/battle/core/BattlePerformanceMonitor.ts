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

interface LogDetails {
  value: number;
  threshold?: number;
  error?: string;
}

interface PerformanceLog {
  type: 'frame_drop' | 'memory_warning' | 'network_latency' | 'js_thread_warning' | 'load_time' | 'error';
  timestamp: number;
  details: LogDetails;
}

export interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  networkLatency: number;
  loadTime: number;
  jsThreadUsage: number;
  lastFrameTime: number;
  networkErrors: number;
  lastNetworkError: Error | null;
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
  private networkErrors: number = 0;
  private lastNetworkError: Error | null = null;
  private frameUpdateLock: boolean = false;
  private memoryCheckTimeout: NodeJS.Timeout | null = null;
  private frameStartTime: number = 0;
  private metrics: PerformanceMetrics = {
    frameRate: 60,
    memoryUsage: 0,
    networkLatency: 0,
    loadTime: 0,
    jsThreadUsage: 0,
    lastFrameTime: 0,
    networkErrors: 0,
    lastNetworkError: null
  };

  private constructor() {}

  public static getInstance(): BattlePerformanceMonitor {
    if (!BattlePerformanceMonitor.instance) {
      BattlePerformanceMonitor.instance = new BattlePerformanceMonitor();
    }
    return BattlePerformanceMonitor.instance;
  }

  public cleanup(): void {
    try {
      this.stopMonitoring();
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.memoryCheckTimeout) {
        clearTimeout(this.memoryCheckTimeout);
        this.memoryCheckTimeout = null;
      }
      this.frameCount = 0;
      this.lastFrameTime = 0;
      this.frameRate = 60;
      this.memoryUsage = 0;
      this.networkLatency = 0;
      this.loadStartTime = 0;
      this.loadTime = 0;
      this.jsThreadUsage = 0;
      this.logs = [];
      this.subscribers.clear();
      this.lastMemoryCheck = 0;
      this.frameTimeHistory = [];
      this.networkErrors = 0;
      this.lastNetworkError = null;
      this.frameUpdateLock = false;
      this.isMonitoring = false;
      this.frameStartTime = 0;
      this.metrics = {
        frameRate: 60,
        memoryUsage: 0,
        networkLatency: 0,
        loadTime: 0,
        jsThreadUsage: 0,
        lastFrameTime: 0,
        networkErrors: 0,
        lastNetworkError: null
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  public startMonitoring(): void {
    this.cleanup();
    this.frameStartTime = 0;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.loadStartTime = null;
    this.metrics = {
      frameRate: 60,
      memoryUsage: 0,
      networkLatency: 0,
      loadTime: 0,
      jsThreadUsage: 0,
      lastFrameTime: 0,
      networkErrors: 0,
      lastNetworkError: null
    };
    this.logs = [];
    this.isMonitoring = true;
    this.startFrameLoop();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public recordFrame(): void {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    this.frameCount++;
    
    const elapsed = now - this.frameStartTime;
    if (elapsed >= 1000) {
      this.calculateFrameRate(now);
    }
    
    this.lastFrameTime = now;
  }

  private calculateFrameRate(now: number): void {
    const elapsed = now - this.frameStartTime;
    
    // Calculate frames per second with proper rounding
    const fps = Math.round((this.frameCount * 1000) / elapsed);
    
    // Special handling for common frame rates
    if (Math.abs(fps - 60) <= 1) {
      this.metrics.frameRate = 60;
    } else if (Math.abs(fps - 30) <= 1) {
      this.metrics.frameRate = 30;
    } else {
      this.metrics.frameRate = fps;
    }
    
    // Log frame drops if below 55fps
    if (this.metrics.frameRate < 55) {
      this.logs.push({
        type: 'frame_drop',
        timestamp: now,
        details: {
          value: this.metrics.frameRate
        }
      });
    }
    
    // Reset counters
    this.frameCount = 0;
    this.frameStartTime = now;
  }

  private startFrameLoop(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    if (this.frameUpdateLock) return;

    this.frameUpdateLock = true;
    try {
      this.recordFrame();
    } finally {
      this.frameUpdateLock = false;
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.startFrameLoop());
  }

  public getMemoryStats(): { usedJSHeapSize: number; jsHeapSizeLimit: number; usagePercentage: number } {
    try {
      if (Platform.OS === 'web' && performance && performance.memory) {
        const memory = performance.memory;
        const usedJSHeapSize = memory.usedJSHeapSize || 0;
        const jsHeapSizeLimit = memory.jsHeapSizeLimit || 100 * 1024 * 1024; // Default 100MB if not set
        const usagePercentage = jsHeapSizeLimit > 0 ? Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100) : 0;
        return {
          usedJSHeapSize,
          jsHeapSizeLimit,
          usagePercentage
        };
      }
      // Return default values for non-web platforms
      return {
        usedJSHeapSize: 0,
        jsHeapSizeLimit: 100 * 1024 * 1024,
        usagePercentage: 0
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {
        usedJSHeapSize: 0,
        jsHeapSizeLimit: 100 * 1024 * 1024,
        usagePercentage: 0
      };
    }
  }

  public checkMemoryUsage(): { usedJSHeapSize: number; jsHeapSizeLimit: number; usagePercentage: number } {
    const stats = this.getMemoryStats();
    this.memoryUsage = stats.usagePercentage;
    if (stats.usagePercentage > 80) {
      this.logs.push({
        type: 'memory_warning',
        timestamp: performance.now(),
        details: {
          value: stats.usagePercentage,
          threshold: 80
        }
      });
      this.notifySubscribers();
    }
    return stats;
  }

  public recordMemoryUsage(usagePercentage: number): void {
    this.memoryUsage = usagePercentage;
    if (usagePercentage > 80) {
      this.logs.push({
        type: 'memory_warning',
        timestamp: performance.now(),
        details: {
          value: usagePercentage,
          threshold: 80
        }
      });
      this.notifySubscribers();
    }
  }

  public getMetrics(): PerformanceMetrics {
    return this.metrics;
  }

  public getLogs(): PerformanceLog[] {
    return [...this.logs];
  }

  private resetLogs(): void {
    this.logs = [];
  }

  private notifySubscribers(): void {
    const metrics = this.getMetrics();
    const subscribers = new Set(this.subscribers); // Create a copy to prevent modification during iteration
    subscribers.forEach(subscriber => {
      try {
        subscriber(metrics);
      } catch (error) {
        console.error('Error in performance subscriber:', error);
      }
    });
  }

  public subscribe(callback: PerformanceSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public recordJSThreadUsage(usage: number): void {
    if (!this.isMonitoring) return;
    this.jsThreadUsage = usage;
    if (usage > 0.8) {
      this.logs.push({
        type: 'js_thread_warning',
        timestamp: performance.now(),
        details: {
          value: usage,
          threshold: 0.8
        }
      });
      this.notifySubscribers();
    }
  }

  public recordNetworkLatency(latency: number): void {
    this.metrics.networkLatency = latency;
    
    // Log high latency
    if (latency > 200) {
      this.logs.push({
        type: 'network_latency',
        timestamp: this.lastFrameTime,
        details: {
          value: latency
        }
      });
    }
  }

  public recordNetworkError(error: Error): void {
    this.networkLatency = 1000;
    this.networkErrors++;
    this.lastNetworkError = error;
    this.notifySubscribers();
  }

  public recordLoadStart(): void {
    this.loadStartTime = this.lastFrameTime;
    this.metrics.loadTime = 0;
  }

  public recordLoadComplete(): void {
    if (this.loadStartTime !== null) {
      const loadTime = this.lastFrameTime - this.loadStartTime;
      this.metrics.loadTime = loadTime;
      
      if (loadTime > 1000) {
        this.logs.push({
          type: 'load_time',
          timestamp: this.lastFrameTime,
          details: {
            value: loadTime
          }
        });
      }
      
      this.loadStartTime = null;
    }
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

  // For testing purposes only
  public _setMockTime(time: number): void {
    if (process.env.NODE_ENV === 'test') {
      const now = time;
      const elapsed = now - this.frameStartTime;
      
      if (elapsed >= 1000) {
        this.calculateFrameRate(now);
      }
      
      this.lastFrameTime = now;
    }
  }
} 