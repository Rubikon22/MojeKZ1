import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

/**
 * Error Reporting and Logging System
 * Provides comprehensive error tracking, crash reporting, and analytics
 */
export class ErrorReporting {
  static logs = [];
  static maxLogs = 1000;
  static isEnabled = !__DEV__; // Enable in production
  static userId = null;
  static sessionId = null;
  static deviceInfo = null;

  // Storage keys
  static STORAGE_KEYS = {
    ERROR_LOGS: 'error_logs',
    CRASH_REPORTS: 'crash_reports',
    USER_FEEDBACK: 'user_feedback',
    ANALYTICS_EVENTS: 'analytics_events',
  };

  // Error severity levels
  static SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  };

  // Error categories
  static CATEGORIES = {
    UI: 'ui',
    NETWORK: 'network',
    DATA: 'data',
    AUTH: 'auth',
    PERFORMANCE: 'performance',
    CRASH: 'crash',
  };

  /**
   * Initialize error reporting system
   */
  static async initialize(options = {}) {
    try {
      this.isEnabled = options.enabled !== undefined ? options.enabled : !__DEV__;
      this.userId = options.userId;
      this.sessionId = this.generateSessionId();
      
      // Gather device information
      this.deviceInfo = await this.collectDeviceInfo();
      
      // Load existing logs
      await this.loadStoredLogs();
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      console.log('Error Reporting initialized', {
        enabled: this.isEnabled,
        sessionId: this.sessionId,
      });
      
      // Log initialization
      this.logEvent('system', 'error_reporting_initialized', {
        deviceInfo: this.deviceInfo,
        sessionId: this.sessionId,
      });
      
    } catch (error) {
      console.error('Error initializing Error Reporting:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  static setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined' && global.HermesInternal) {
      // Hermes engine
      global.HermesInternal.setPromiseRejectionTracker((id, rejection) => {
        this.captureException(rejection, {
          context: 'unhandled_promise_rejection',
          promiseId: id,
        });
      });
    }

    // Handle React errors (will be caught by error boundaries)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        this.captureException(new Error(args.join(' ')), {
          context: 'react_error',
          severity: this.SEVERITY.HIGH,
        });
      }
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Capture an exception/error
   */
  static captureException(error, context = {}) {
    if (!this.isEnabled) return;

    const errorReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      
      // Error details
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      name: error.name || 'Error',
      
      // Context
      severity: context.severity || this.getSeverityFromError(error),
      category: context.category || this.getCategoryFromError(error),
      context: context.context || 'unknown',
      
      // Additional context
      ...context,
      
      // Device and app info
      deviceInfo: this.deviceInfo,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    };

    this.addLog(errorReport);
    
    // Send to remote service if available
    this.sendToRemoteService(errorReport);
    
    return errorReport.id;
  }

  /**
   * Log a custom event
   */
  static logEvent(category, event, data = {}) {
    if (!this.isEnabled) return;

    const eventLog = {
      id: this.generateId(),
      type: 'event',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      category,
      event,
      data,
      deviceInfo: this.deviceInfo,
    };

    this.addLog(eventLog);
    
    // Don't send all events to remote service, only important ones
    if (this.shouldSendEventToRemote(category, event)) {
      this.sendToRemoteService(eventLog);
    }
  }

  /**
   * Log performance metrics
   */
  static logPerformance(metric, value, unit = 'ms', context = {}) {
    this.logEvent('performance', metric, {
      value,
      unit,
      ...context,
    });
  }

  /**
   * Log user action
   */
  static logUserAction(action, screen, data = {}) {
    this.logEvent('user_action', action, {
      screen,
      ...data,
    });
  }

  /**
   * Log network request
   */
  static logNetworkRequest(url, method, status, duration, error = null) {
    this.logEvent('network', 'request', {
      url,
      method,
      status,
      duration,
      error: error ? error.message : null,
      success: !error && status >= 200 && status < 300,
    });
  }

  /**
   * Capture user feedback
   */
  static async captureUserFeedback(feedback, context = {}) {
    const feedbackReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      feedback,
      context,
      deviceInfo: this.deviceInfo,
    };

    // Store locally
    try {
      const existing = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_FEEDBACK);
      const feedbacks = existing ? JSON.parse(existing) : [];
      feedbacks.push(feedbackReport);
      
      // Keep only last 50 feedbacks
      if (feedbacks.length > 50) {
        feedbacks.splice(0, feedbacks.length - 50);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_FEEDBACK, JSON.stringify(feedbacks));
    } catch (error) {
      console.error('Error storing user feedback:', error);
    }

    // Send to remote service
    this.sendToRemoteService(feedbackReport);
    
    return feedbackReport.id;
  }

  /**
   * Get stored logs
   */
  static getLogs(category = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (category) {
      filteredLogs = this.logs.filter(log => log.category === category);
    }
    
    return filteredLogs.slice(-limit);
  }

  /**
   * Get error statistics
   */
  static getErrorStats() {
    const errorLogs = this.logs.filter(log => log.stack);
    
    const stats = {
      totalErrors: errorLogs.length,
      bySeverity: {},
      byCategory: {},
      byContext: {},
      recent: errorLogs.slice(-10),
    };

    errorLogs.forEach(log => {
      // By severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      
      // By category
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      
      // By context
      stats.byContext[log.context] = (stats.byContext[log.context] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export logs for debugging
   */
  static async exportLogs() {
    try {
      const allData = {
        logs: this.logs,
        deviceInfo: this.deviceInfo,
        sessionId: this.sessionId,
        userId: this.userId,
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(allData, null, 2);
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }

  /**
   * Clear all logs
   */
  static async clearLogs() {
    try {
      this.logs = [];
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.ERROR_LOGS,
        this.STORAGE_KEYS.CRASH_REPORTS,
        this.STORAGE_KEYS.USER_FEEDBACK,
        this.STORAGE_KEYS.ANALYTICS_EVENTS,
      ]);
      
      this.logEvent('system', 'logs_cleared');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }

  /**
   * Set user ID for error tracking
   */
  static setUserId(userId) {
    this.userId = userId;
    this.logEvent('system', 'user_identified', { userId });
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(message, category = 'manual', data = {}) {
    this.logEvent('breadcrumb', message, {
      category,
      ...data,
    });
  }

  // Private methods

  /**
   * Add log to storage
   */
  static addLog(log) {
    this.logs.push(log);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Store to AsyncStorage (debounced)
    this.debouncedSaveLogs();
  }

  /**
   * Debounced save to AsyncStorage
   */
  static debouncedSaveLogs = (() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(
            this.STORAGE_KEYS.ERROR_LOGS,
            JSON.stringify(this.logs.slice(-500)) // Save last 500 logs
          );
        } catch (error) {
          console.error('Error saving logs to storage:', error);
        }
      }, 1000);
    };
  })();

  /**
   * Load stored logs
   */
  static async loadStoredLogs() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.ERROR_LOGS);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading stored logs:', error);
    }
  }

  /**
   * Send error to remote service
   */
  static async sendToRemoteService(errorReport) {
    if (!this.isEnabled || __DEV__) return;

    try {
      // This would integrate with services like Sentry, Bugsnag, Firebase Crashlytics, etc.
      // For now, we'll just log it
      console.log('Would send to remote service:', errorReport);
      
      // Example integration with a hypothetical service:
      /*
      await fetch('https://your-error-service.com/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY',
        },
        body: JSON.stringify(errorReport),
      });
      */
    } catch (error) {
      console.error('Error sending to remote service:', error);
    }
  }

  /**
   * Collect device information
   */
  static async collectDeviceInfo() {
    try {
      // Note: DeviceInfo might not be available in all setups
      // This is a placeholder for the actual implementation
      return {
        platform: Platform.OS,
        version: Platform.Version,
        // device: await DeviceInfo.getDevice(),
        // systemVersion: await DeviceInfo.getSystemVersion(),
        // appVersion: await DeviceInfo.getVersion(),
        // buildNumber: await DeviceInfo.getBuildNumber(),
        // bundleId: await DeviceInfo.getBundleId(),
        // deviceId: await DeviceInfo.getDeviceId(),
        // isEmulator: await DeviceInfo.isEmulator(),
        // totalMemory: await DeviceInfo.getTotalMemory(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error collecting device info:', error);
      return {
        platform: Platform.OS,
        version: Platform.Version,
        error: 'Failed to collect device info',
      };
    }
  }

  /**
   * Generate unique ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate session ID
   */
  static generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2)}`;
  }

  /**
   * Determine error severity from error object
   */
  static getSeverityFromError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('crash') || message.includes('fatal')) {
      return this.SEVERITY.CRITICAL;
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return this.SEVERITY.MEDIUM;
    }
    
    if (message.includes('validation') || message.includes('input')) {
      return this.SEVERITY.LOW;
    }
    
    return this.SEVERITY.MEDIUM;
  }

  /**
   * Determine error category from error object
   */
  static getCategoryFromError(error) {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('api')) {
      return this.CATEGORIES.NETWORK;
    }
    
    if (message.includes('auth') || message.includes('login') || message.includes('session')) {
      return this.CATEGORIES.AUTH;
    }
    
    if (message.includes('storage') || message.includes('database')) {
      return this.CATEGORIES.DATA;
    }
    
    if (stack.includes('react-native') || message.includes('render')) {
      return this.CATEGORIES.UI;
    }
    
    return this.CATEGORIES.CRASH;
  }

  /**
   * Determine if event should be sent to remote service
   */
  static shouldSendEventToRemote(category, event) {
    // Only send important events to reduce bandwidth
    const importantEvents = [
      'error', 'crash', 'performance_issue', 
      'user_feedback', 'critical_action'
    ];
    
    return importantEvents.includes(event) || 
           category === 'performance' ||
           category === 'error';
  }
}

/**
 * React hook for error reporting
 */
export const useErrorReporting = () => {
  const [errorStats, setErrorStats] = React.useState(null);

  React.useEffect(() => {
    setErrorStats(ErrorReporting.getErrorStats());
    
    // Update stats periodically
    const interval = setInterval(() => {
      setErrorStats(ErrorReporting.getErrorStats());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    captureException: ErrorReporting.captureException.bind(ErrorReporting),
    logEvent: ErrorReporting.logEvent.bind(ErrorReporting),
    logUserAction: ErrorReporting.logUserAction.bind(ErrorReporting),
    logPerformance: ErrorReporting.logPerformance.bind(ErrorReporting),
    addBreadcrumb: ErrorReporting.addBreadcrumb.bind(ErrorReporting),
    captureUserFeedback: ErrorReporting.captureUserFeedback.bind(ErrorReporting),
    errorStats,
    getLogs: ErrorReporting.getLogs.bind(ErrorReporting),
    exportLogs: ErrorReporting.exportLogs.bind(ErrorReporting),
    clearLogs: ErrorReporting.clearLogs.bind(ErrorReporting),
  };
};

/**
 * Higher-order component for automatic error reporting
 */
export const withErrorReporting = (Component, componentName) => {
  return (props) => {
    React.useEffect(() => {
      ErrorReporting.addBreadcrumb(`Mounted ${componentName}`, 'navigation');
      
      return () => {
        ErrorReporting.addBreadcrumb(`Unmounted ${componentName}`, 'navigation');
      };
    }, []);

    const handleError = (error, errorInfo) => {
      ErrorReporting.captureException(error, {
        context: `component_${componentName}`,
        componentStack: errorInfo?.componentStack,
        severity: ErrorReporting.SEVERITY.HIGH,
      });
    };

    return (
      <Component
        {...props}
        onError={handleError}
      />
    );
  };
};

export default ErrorReporting;