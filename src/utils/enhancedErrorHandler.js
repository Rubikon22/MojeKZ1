import React from 'react';
import { Alert, Platform } from 'react-native';
import { NetworkStatus } from './networkStatus';

/**
 * Enhanced Error Handler with comprehensive error handling and recovery mechanisms
 * Handles network errors, API errors, validation errors, and provides user-friendly recovery options
 */
export class EnhancedErrorHandler {
  static listeners = new Set();
  static errorQueue = [];
  static retryAttempts = new Map();
  static maxRetryAttempts = 3;
  static retryDelay = 1000; // Base delay in milliseconds

  // Error types for categorization
  static ERROR_TYPES = {
    NETWORK: 'NETWORK',
    API: 'API',
    VALIDATION: 'VALIDATION',
    STORAGE: 'STORAGE',
    AUTHENTICATION: 'AUTHENTICATION',
    PERMISSION: 'PERMISSION',
    UNKNOWN: 'UNKNOWN',
  };

  // Recovery strategies
  static RECOVERY_STRATEGIES = {
    RETRY: 'RETRY',
    FALLBACK: 'FALLBACK',
    OFFLINE_MODE: 'OFFLINE_MODE',
    USER_ACTION: 'USER_ACTION',
    RESET: 'RESET',
  };

  /**
   * Categorize error based on error object and context
   */
  static categorizeError(error, context = {}) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.status;

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorCode === 'NETWORK_ERROR'
    ) {
      return this.ERROR_TYPES.NETWORK;
    }

    // API errors
    if (
      errorCode >= 400 ||
      errorMessage.includes('api') ||
      errorMessage.includes('server') ||
      context.source === 'supabase'
    ) {
      return this.ERROR_TYPES.API;
    }

    // Authentication errors
    if (
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('session')
    ) {
      return this.ERROR_TYPES.AUTHENTICATION;
    }

    // Storage errors
    if (
      errorMessage.includes('storage') ||
      errorMessage.includes('asyncstorage') ||
      context.source === 'storage'
    ) {
      return this.ERROR_TYPES.STORAGE;
    }

    // Validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      context.source === 'validation'
    ) {
      return this.ERROR_TYPES.VALIDATION;
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('denied') ||
      context.source === 'permission'
    ) {
      return this.ERROR_TYPES.PERMISSION;
    }

    return this.ERROR_TYPES.UNKNOWN;
  }

  /**
   * Get user-friendly error message based on error type and context
   */
  static getUserFriendlyMessage(error, errorType, context = {}) {
    const baseMessages = {
      [this.ERROR_TYPES.NETWORK]: {
        title: 'Problemy z połączeniem',
        message: 'Sprawdź połączenie z internetem i spróbuj ponownie.',
        action: 'Spróbuj ponownie',
      },
      [this.ERROR_TYPES.API]: {
        title: 'Błąd serwera',
        message: 'Serwer jest tymczasowo niedostępny. Spróbuj ponownie za chwilę.',
        action: 'Ponów próbę',
      },
      [this.ERROR_TYPES.AUTHENTICATION]: {
        title: 'Błąd uwierzytelniania',
        message: 'Sesja wygasła. Zaloguj się ponownie.',
        action: 'Zaloguj się',
      },
      [this.ERROR_TYPES.STORAGE]: {
        title: 'Błąd zapisu danych',
        message: 'Nie można zapisać danych. Sprawdź dostępną pamięć.',
        action: 'Spróbuj ponownie',
      },
      [this.ERROR_TYPES.VALIDATION]: {
        title: 'Nieprawidłowe dane',
        message: 'Sprawdź poprawność wprowadzonych danych.',
        action: 'Popraw dane',
      },
      [this.ERROR_TYPES.PERMISSION]: {
        title: 'Brak uprawnień',
        message: 'Aplikacja nie ma wymaganych uprawnień.',
        action: 'Sprawdź uprawnienia',
      },
      [this.ERROR_TYPES.UNKNOWN]: {
        title: 'Nieoczekiwany błąd',
        message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
        action: 'Spróbuj ponownie',
      },
    };

    const baseMessage = baseMessages[errorType] || baseMessages[this.ERROR_TYPES.UNKNOWN];

    // Context-specific customizations
    if (context.operation === 'book_save') {
      return {
        ...baseMessage,
        message: 'Nie udało się zapisać książki. ' + baseMessage.message,
      };
    }

    if (context.operation === 'book_load') {
      return {
        ...baseMessage,
        message: 'Nie udało się załadować książek. ' + baseMessage.message,
      };
    }

    if (context.operation === 'login') {
      return {
        ...baseMessage,
        message: 'Nie udało się zalogować. ' + baseMessage.message,
      };
    }

    return baseMessage;
  }

  /**
   * Determine recovery strategy based on error type and context
   */
  static getRecoveryStrategy(errorType, context = {}) {
    switch (errorType) {
      case this.ERROR_TYPES.NETWORK:
        return this.RECOVERY_STRATEGIES.RETRY;
      
      case this.ERROR_TYPES.API:
        if (context.hasLocalFallback) {
          return this.RECOVERY_STRATEGIES.FALLBACK;
        }
        return this.RECOVERY_STRATEGIES.RETRY;
      
      case this.ERROR_TYPES.AUTHENTICATION:
        return this.RECOVERY_STRATEGIES.USER_ACTION;
      
      case this.ERROR_TYPES.STORAGE:
        return this.RECOVERY_STRATEGIES.RETRY;
      
      case this.ERROR_TYPES.VALIDATION:
        return this.RECOVERY_STRATEGIES.USER_ACTION;
      
      case this.ERROR_TYPES.PERMISSION:
        return this.RECOVERY_STRATEGIES.USER_ACTION;
      
      default:
        return this.RECOVERY_STRATEGIES.RETRY;
    }
  }

  /**
   * Execute recovery strategy
   */
  static async executeRecoveryStrategy(strategy, options = {}) {
    const {
      originalOperation,
      retryFunction,
      fallbackFunction,
      userActionFunction,
      resetFunction,
      context = {},
    } = options;

    switch (strategy) {
      case this.RECOVERY_STRATEGIES.RETRY:
        if (retryFunction) {
          return await this.withRetry(retryFunction, context);
        }
        break;

      case this.RECOVERY_STRATEGIES.FALLBACK:
        if (fallbackFunction) {
          return await fallbackFunction();
        }
        break;

      case this.RECOVERY_STRATEGIES.OFFLINE_MODE:
        return await this.enableOfflineMode(context);

      case this.RECOVERY_STRATEGIES.USER_ACTION:
        if (userActionFunction) {
          return await userActionFunction();
        }
        break;

      case this.RECOVERY_STRATEGIES.RESET:
        if (resetFunction) {
          return await resetFunction();
        }
        break;

      default:
        throw new Error('Unknown recovery strategy');
    }
  }

  /**
   * Enhanced error handling with automatic recovery
   */
  static async handleError(error, context = {}) {
    const errorId = Date.now() + Math.random();
    const errorType = this.categorizeError(error, context);
    const userMessage = this.getUserFriendlyMessage(error, errorType, context);
    const recoveryStrategy = this.getRecoveryStrategy(errorType, context);

    // Log error for monitoring
    this.logError(error, { errorId, errorType, context });

    // Notify listeners
    this.notifyListeners('error', {
      errorId,
      error,
      errorType,
      userMessage,
      recoveryStrategy,
      context,
    });

    // Handle based on context preference
    if (context.silent) {
      return { errorId, errorType, userMessage, recoveryStrategy };
    }

    // Show user-friendly error with recovery options
    return new Promise((resolve) => {
      const buttons = this.createErrorButtons(error, errorType, recoveryStrategy, context, resolve);
      
      Alert.alert(
        userMessage.title,
        userMessage.message,
        buttons,
        { cancelable: false }
      );
    });
  }

  /**
   * Create appropriate alert buttons based on recovery strategy
   */
  static createErrorButtons(error, errorType, recoveryStrategy, context, resolve) {
    const buttons = [];

    // Add recovery action button
    if (recoveryStrategy === this.RECOVERY_STRATEGIES.RETRY && context.retryFunction) {
      buttons.push({
        text: 'Spróbuj ponownie',
        onPress: async () => {
          try {
            const result = await this.executeRecoveryStrategy(recoveryStrategy, context);
            resolve({ success: true, result });
          } catch (retryError) {
            resolve({ success: false, error: retryError });
          }
        },
      });
    }

    if (recoveryStrategy === this.RECOVERY_STRATEGIES.USER_ACTION && context.userActionFunction) {
      buttons.push({
        text: context.actionButtonText || 'Wykonaj akcję',
        onPress: async () => {
          try {
            const result = await context.userActionFunction();
            resolve({ success: true, result });
          } catch (actionError) {
            resolve({ success: false, error: actionError });
          }
        },
      });
    }

    // Add fallback button if available
    if (context.fallbackFunction) {
      buttons.push({
        text: 'Użyj trybu offline',
        onPress: async () => {
          try {
            const result = await context.fallbackFunction();
            resolve({ success: true, result, fallback: true });
          } catch (fallbackError) {
            resolve({ success: false, error: fallbackError });
          }
        },
      });
    }

    // Add cancel/dismiss button
    buttons.push({
      text: 'Anuluj',
      style: 'cancel',
      onPress: () => resolve({ success: false, cancelled: true }),
    });

    return buttons;
  }

  /**
   * Retry function with exponential backoff
   */
  static async withRetry(fn, context = {}) {
    const operationId = context.operationId || 'unknown';
    const maxAttempts = context.maxRetryAttempts || this.maxRetryAttempts;
    
    let currentAttempt = this.retryAttempts.get(operationId) || 0;

    while (currentAttempt < maxAttempts) {
      try {
        currentAttempt++;
        this.retryAttempts.set(operationId, currentAttempt);

        // Check network status for network-related operations
        if (context.requiresNetwork) {
          const isOnline = await NetworkStatus.isOnline();
          if (!isOnline) {
            await NetworkStatus.waitForConnection(5000);
          }
        }

        const result = await fn();
        
        // Clear retry count on success
        this.retryAttempts.delete(operationId);
        
        return result;
      } catch (error) {
        console.log(`Retry attempt ${currentAttempt}/${maxAttempts} failed:`, error.message);

        if (currentAttempt >= maxAttempts) {
          this.retryAttempts.delete(operationId);
          throw error;
        }

        // Exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, currentAttempt - 1);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Enable offline mode functionality
   */
  static async enableOfflineMode(context = {}) {
    this.notifyListeners('offline_mode_enabled', context);
    
    // Implementation depends on specific app requirements
    // This could involve switching to local storage, disabling sync, etc.
    return { offlineModeEnabled: true };
  }

  /**
   * Higher-order function for error handling
   */
  static withErrorHandling = (fn, context = {}) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (context.silent) {
          const errorInfo = await this.handleError(error, { ...context, silent: true });
          return { error: errorInfo };
        }
        
        const result = await this.handleError(error, context);
        if (result.success) {
          return result.result;
        }
        
        throw result.error || error;
      }
    };
  };

  /**
   * React hook for error handling
   */
  static useErrorHandler = () => {
    const [errors, setErrors] = React.useState([]);
    const [isOffline, setIsOffline] = React.useState(false);

    React.useEffect(() => {
      const unsubscribe = this.addListener((event, data) => {
        if (event === 'error') {
          setErrors(prev => [...prev, data]);
        } else if (event === 'offline_mode_enabled') {
          setIsOffline(true);
        }
      });

      return unsubscribe;
    }, []);

    const clearErrors = () => setErrors([]);
    const clearError = (errorId) => setErrors(prev => prev.filter(e => e.errorId !== errorId));

    return {
      errors,
      isOffline,
      clearErrors,
      clearError,
      handleError: (error, context) => this.handleError(error, context),
      withErrorHandling: (fn, context) => this.withErrorHandling(fn, context),
    };
  };

  /**
   * Add error listener
   */
  static addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  static notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in error handler listener:', error);
      }
    });
  }

  /**
   * Log error for monitoring and debugging
   */
  static logError(error, metadata = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      platform: Platform.OS,
      ...metadata,
    };

    console.error('Enhanced Error Handler:', errorLog);

    // In production, send to error reporting service
    if (!__DEV__ && this.errorReportingService) {
      this.errorReportingService.captureException(error, { extra: errorLog });
    }
  }

  /**
   * Sleep utility for retry delays
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Configure error reporting service
   */
  static configure(options = {}) {
    this.errorReportingService = options.errorReportingService;
    this.maxRetryAttempts = options.maxRetryAttempts || this.maxRetryAttempts;
    this.retryDelay = options.retryDelay || this.retryDelay;
  }

  /**
   * Get error statistics
   */
  static getErrorStats() {
    return {
      totalErrors: this.errorQueue.length,
      retryAttempts: Object.fromEntries(this.retryAttempts),
      errorsByType: this.errorQueue.reduce((acc, error) => {
        acc[error.errorType] = (acc[error.errorType] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Clear error statistics
   */
  static clearErrorStats() {
    this.errorQueue = [];
    this.retryAttempts.clear();
  }
}

// Export convenience methods
export const handleError = EnhancedErrorHandler.handleError.bind(EnhancedErrorHandler);
export const withErrorHandling = EnhancedErrorHandler.withErrorHandling.bind(EnhancedErrorHandler);
export const useErrorHandler = EnhancedErrorHandler.useErrorHandler;

export default EnhancedErrorHandler;