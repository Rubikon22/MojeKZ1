import { Alert } from 'react-native';
import { ERROR_MESSAGES } from '../constants';

/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Show user-friendly error message
   * @param {Error|string} error - Error object or string
   * @param {string} title - Alert title
   * @param {function} onPress - Optional callback
   */
  static showError(error, title = 'Błąd', onPress = null) {
    const message = this.getErrorMessage(error);
    Alert.alert(title, message, [{ text: 'OK', onPress }]);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   * @param {string} title - Alert title
   * @param {function} onPress - Optional callback
   */
  static showSuccess(message, title = 'Sukces', onPress = null) {
    Alert.alert(title, message, [{ text: 'OK', onPress }]);
  }

  /**
   * Get user-friendly error message
   * @param {Error|string} error - Error object or string
   * @returns {string} User-friendly error message
   */
  static getErrorMessage(error) {
    if (typeof error === 'string') return error;
    
    if (error?.message) {
      const { message } = error;
      
      // Database errors
      if (message.includes('duplicate key value')) {
        return ERROR_MESSAGES.DUPLICATE;
      }
      if (message.includes('not null violation')) {
        return ERROR_MESSAGES.VALIDATION;
      }
      if (message.includes('network') || message.includes('fetch')) {
        return ERROR_MESSAGES.NETWORK;
      }
      if (message.includes('Invalid login credentials')) {
        return ERROR_MESSAGES.AUTH_FAILED;
      }
      
      return message;
    }
    
    return ERROR_MESSAGES.GENERIC;
  }

  /**
   * Log error for debugging
   * @param {Error|string} error - Error to log
   * @param {string} context - Context where error occurred
   */
  static logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    
    console.error(`[${timestamp}] ${context}: ${errorMessage}`);
    
    // In production, you might want to send this to a logging service
    if (__DEV__) {
      console.error('Full error object:', error);
    }
  }

  /**
   * Handle async operations with error catching
   * @param {function} asyncFn - Async function to execute
   * @param {string} context - Context for error logging
   * @param {function} onError - Optional error handler
   * @returns {Promise} Result of async function or null if error
   */
  static async handleAsync(asyncFn, context = '', onError = null) {
    try {
      return await asyncFn();
    } catch (error) {
      this.logError(error, context);
      
      if (onError) {
        onError(error);
      } else {
        this.showError(error);
      }
      
      return null;
    }
  }
}

/**
 * HOC for error boundary-like behavior in functional components
 * @param {function} WrappedComponent - Component to wrap
 * @returns {function} Wrapped component with error handling
 */
export const withErrorHandler = (WrappedComponent) => {
  return (props) => {
    const handleError = (error, errorInfo) => {
      ErrorHandler.logError(error, `Component: ${WrappedComponent.name}`);
      ErrorHandler.showError(ERROR_MESSAGES.GENERIC);
    };

    try {
      return <WrappedComponent {...props} />;
    } catch (error) {
      handleError(error);
      return null;
    }
  };
};