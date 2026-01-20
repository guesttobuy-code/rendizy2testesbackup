/**
 * StaysNet Integration - Structured Logger
 * Centralized logging system for debugging and monitoring
 */

import { toast } from 'sonner';

type LogLevel = 'info' | 'success' | 'warning' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class StaysNetLogger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  private log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with emoji and color
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[level];

    const color = {
      info: 'color: #3b82f6',
      success: 'color: #10b981',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
    }[level];

    console.log(
      `%c${emoji} [StaysNet:${category}] ${message}`,
      color,
      data || ''
    );

    // Send errors to monitoring service (future: Sentry, LogRocket, etc)
    if (level === 'error' && typeof window !== 'undefined') {
      // window.errorTracker?.captureException(new Error(message), { extra: data });
    }
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data);
    toast.success(message);
  }

  warning(category: string, message: string, data?: any) {
    this.log('warning', category, message, data);
    toast.warning(message);
  }

  error(category: string, message: string, error?: Error | any) {
    this.log('error', category, message, error);
    toast.error(message);
  }

  // Get logs for debugging
  getLogs(level?: LogLevel, category?: string): LogEntry[] {
    return this.logs.filter(
      (log) =>
        (!level || log.level === level) &&
        (!category || log.category === category)
    );
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for support
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const logger = new StaysNetLogger();

// Convenience exports
export const staysnetLogger = {
  config: {
    info: (msg: string, data?: any) => logger.info('Config', msg, data),
    success: (msg: string, data?: any) => logger.success('Config', msg, data),
    warning: (msg: string, data?: any) => logger.warning('Config', msg, data),
    error: (msg: string, error?: any) => logger.error('Config', msg, error),
  },
  connection: {
    info: (msg: string, data?: any) => logger.info('Connection', msg, data),
    success: (msg: string, data?: any) => logger.success('Connection', msg, data),
    error: (msg: string, error?: any) => logger.error('Connection', msg, error),
  },
  import: {
    info: (msg: string, data?: any) => logger.info('Import', msg, data),
    success: (msg: string, data?: any) => logger.success('Import', msg, data),
    warning: (msg: string, data?: any) => logger.warning('Import', msg, data),
    error: (msg: string, error?: any) => logger.error('Import', msg, error),
  },
  properties: {
    info: (msg: string, data?: any) => logger.info('Properties', msg, data),
    success: (msg: string, data?: any) => logger.success('Properties', msg, data),
    error: (msg: string, error?: any) => logger.error('Properties', msg, error),
  },
  api: {
    info: (msg: string, data?: any) => logger.info('API', msg, data),
    error: (msg: string, error?: any) => logger.error('API', msg, error),
  },
};
