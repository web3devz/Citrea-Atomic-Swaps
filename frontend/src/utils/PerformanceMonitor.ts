/* eslint-disable @typescript-eslint/no-explicit-any */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled = process.env.NODE_ENV === 'development';

  start(name: string, metadata?: any) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
    console.log(`🚀 [Performance] Started: ${name}`);
  }

  end(name: string) {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ [Performance] No start time found for: ${name}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    const durationText = duration < 1000 ? `${Math.round(duration)}ms` : `${(duration / 1000).toFixed(2)}s`;
    const emoji = duration < 500 ? '⚡' : duration < 2000 ? '⏱️' : '🐌';
    
    console.log(`${emoji} [Performance] Completed: ${name} in ${durationText}`);

    // Alert if operation is slow
    if (duration > 3000) {
      console.warn(`🚨 [Performance] Slow operation detected: ${name} took ${durationText}`);
    }

    return metric;
  }

  measure(name: string, fn: (...args: any[]) => Promise<any>) {
    return async (...args: any[]) => {
      this.start(name);
      try {
        const result = await fn.apply(this, args as any[]);
        this.end(name);
        return result;
      } catch (error) {
        this.end(name);
        throw error;
      }
    };
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  clear() {
    this.metrics.clear();
  }

  logSummary() {
    if (!this.isEnabled) return;

    const completed = this.getMetrics().filter(m => m.duration !== undefined);
    if (completed.length === 0) return;

    console.group('📊 Performance Summary');
    completed.forEach(metric => {
      const durationText = metric.duration! < 1000 
        ? `${Math.round(metric.duration!)}ms` 
        : `${(metric.duration! / 1000).toFixed(2)}s`;
      console.log(`${metric.name}: ${durationText}`);
    });
    console.groupEnd();
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Decorator for async functions
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      perfMonitor.start(name || `${target.constructor.name}.${propertyKey}`);
      try {
        const result = await originalMethod.apply(this, args);
        perfMonitor.end(name || `${target.constructor.name}.${propertyKey}`);
        return result;
      } catch (error) {
        perfMonitor.end(name || `${target.constructor.name}.${propertyKey}`);
        throw error;
      }
    };

    return descriptor;
  };
}

// Helper function for timing async operations
export async function withTiming<T>(name: string, operation: () => Promise<T>): Promise<T> {
  perfMonitor.start(name);
  try {
    const result = await operation();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.end(name);
    throw error;
  }
}
