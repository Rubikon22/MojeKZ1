/**
 * Error Handling Integration Guide and Examples
 * 
 * This file demonstrates how to integrate all error handling components
 * in a React Native application for comprehensive error management.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { EnhancedErrorHandler } from './enhancedErrorHandler';
import { ErrorNotification, OfflineNotification, ConnectionStatus } from '../components/ErrorNotification';
import { NetworkErrorFallback, DataLoadingErrorFallback } from '../components/ErrorFallback';
import { OfflineManager } from './offlineManager';
import { ErrorReporting } from './errorReporting';
import { ValidationErrorHandler } from './validationErrorHandler';
import { NetworkStatus } from './networkStatus';

/**
 * 1. APPLICATION INITIALIZATION
 * Initialize all error handling systems at app startup
 */
export const initializeErrorHandling = async (options = {}) => {
  try {
    // Initialize Enhanced Error Handler
    EnhancedErrorHandler.configure({
      maxRetryAttempts: 3,
      retryDelay: 1000,
      errorReportingService: options.errorReportingService,
    });

    // Initialize Error Reporting
    await ErrorReporting.initialize({
      enabled: !__DEV__,
      userId: options.userId,
    });

    // Initialize Offline Manager
    await OfflineManager.initialize();

    // Initialize Network Status
    NetworkStatus.initialize();

    // Initialize Validation Error Handler
    ValidationErrorHandler.initialize(options.customValidationMessages);

    console.log('Error handling systems initialized successfully');
  } catch (error) {
    console.error('Error initializing error handling:', error);
  }
};

/**
 * 2. APP-LEVEL INTEGRATION
 * Wrap your app with error handling providers
 */
export const AppWithErrorHandling = ({ children }) => {
  useEffect(() => {
    initializeErrorHandling();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* Your app content */}
      {children}
      
      {/* Global error notifications */}
      <ErrorNotification type="snackbar" />
      <OfflineNotification />
      <ConnectionStatus />
    </View>
  );
};

/**
 * 3. NETWORK OPERATIONS WITH ERROR HANDLING
 * Example of handling API calls with comprehensive error management
 */
export const apiCallWithErrorHandling = async (apiFunction, context = {}) => {
  return EnhancedErrorHandler.withErrorHandling(
    async () => {
      // Check network status first
      const isOnline = await NetworkStatus.isOnline();
      
      if (!isOnline && !context.allowOffline) {
        throw new Error('No internet connection');
      }

      // Execute API call
      const result = await apiFunction();
      
      // Log successful operation
      ErrorReporting.logEvent('api', 'success', {
        endpoint: context.endpoint,
        duration: context.duration,
      });

      return result;
    },
    {
      // Error handling context
      requiresNetwork: true,
      operationId: context.operationId || 'api_call',
      maxRetryAttempts: context.retryAttempts || 3,
      
      // Fallback to offline if available
      fallbackFunction: context.offlineFallback,
      
      // User action for authentication errors
      userActionFunction: context.onAuthError,
      actionButtonText: 'Zaloguj się ponownie',
      
      // Retry function
      retryFunction: apiFunction,
    }
  );
};

/**
 * 4. FORM VALIDATION INTEGRATION
 * Example of comprehensive form validation with error handling
 */
export const BookFormValidationExample = () => {
  const validationSchema = {
    title: [
      { type: ValidationErrorHandler.ERROR_TYPES.REQUIRED },
      { 
        type: ValidationErrorHandler.ERROR_TYPES.LENGTH, 
        params: { min: 2, max: 100 }
      },
    ],
    author: [
      { type: ValidationErrorHandler.ERROR_TYPES.REQUIRED },
      { 
        type: ValidationErrorHandler.ERROR_TYPES.LENGTH, 
        params: { min: 2, max: 50 }
      },
    ],
    isbn: [
      {
        type: ValidationErrorHandler.ERROR_TYPES.FORMAT,
        params: { format: 'isbn' }
      },
      {
        type: ValidationErrorHandler.ERROR_TYPES.ASYNC,
        params: {
          validator: async (isbn) => {
            // Check if ISBN already exists
            const exists = await checkISBNExists(isbn);
            return !exists;
          }
        }
      }
    ],
    rating: [
      {
        type: ValidationErrorHandler.ERROR_TYPES.RANGE,
        params: { min: 1, max: 5 }
      }
    ],
  };

  // Form validation integration would go here
  // See validationErrorHandler.js for useFormValidation hook
};

/**
 * 5. OFFLINE OPERATIONS
 * Example of handling offline operations with sync
 */
export const addBookWithOfflineSupport = async (bookData) => {
  try {
    const isOnline = await NetworkStatus.isOnline();
    
    if (isOnline) {
      // Try online operation first
      return await apiCallWithErrorHandling(
        () => addBookToServer(bookData),
        {
          operationId: 'add_book',
          endpoint: '/books',
          offlineFallback: () => OfflineManager.createBookOffline(bookData),
        }
      );
    } else {
      // Create book offline
      ErrorReporting.logEvent('offline', 'book_created_offline');
      return await OfflineManager.createBookOffline(bookData);
    }
  } catch (error) {
    // Enhanced error handling will show appropriate UI
    throw error;
  }
};

/**
 * 6. COMPONENT-LEVEL ERROR BOUNDARIES
 * Example of using error boundaries with fallback UI
 */
export const BookListWithErrorHandling = () => {
  const [books, setBooks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const booksData = await apiCallWithErrorHandling(
        () => fetchBooksFromServer(),
        {
          operationId: 'load_books',
          endpoint: '/books',
          offlineFallback: () => OfflineManager.loadOfflineBooks(),
        }
      );
      
      setBooks(booksData);
    } catch (err) {
      setError(err);
      ErrorReporting.captureException(err, {
        context: 'BookList.loadBooks',
        severity: ErrorReporting.SEVERITY.MEDIUM,
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBooks();
  }, []);

  if (loading) {
    return <LoadingComponent />;
  }

  if (error) {
    return (
      <DataLoadingErrorFallback
        dataType="książek"
        onRetry={loadBooks}
        onRefresh={() => {
          // Force refresh from server
          OfflineManager.clearOfflineData();
          loadBooks();
        }}
        canUseCache={true}
        onUseCache={async () => {
          const offlineBooks = await OfflineManager.loadOfflineBooks();
          setBooks(offlineBooks || []);
          setError(null);
        }}
      />
    );
  }

  if (books.length === 0) {
    return (
      <EmptyStateFallback
        title="Brak książek"
        message="Nie masz jeszcze żadnych książek w swojej bibliotece."
        icon="📚"
        onAction={() => {/* Navigate to add book */}}
        actionLabel="Dodaj pierwszą książkę"
      />
    );
  }

  return (
    <View>
      {/* Render books list */}
    </View>
  );
};

/**
 * 7. PERMISSION HANDLING
 * Example of handling permissions with error fallbacks
 */
export const handleCameraPermission = async () => {
  try {
    const permission = await requestCameraPermission();
    
    if (permission === 'granted') {
      return true;
    } else {
      throw new Error('Camera permission denied');
    }
  } catch (error) {
    return EnhancedErrorHandler.handleError(error, {
      errorType: EnhancedErrorHandler.ERROR_TYPES.PERMISSION,
      context: {
        permission: 'camera',
        userActionFunction: async () => {
          // Open app settings
          await openAppSettings();
        },
        actionButtonText: 'Otwórz ustawienia',
      },
    });
  }
};

/**
 * 8. PERFORMANCE MONITORING
 * Example of monitoring performance with error reporting
 */
export const monitoredOperation = async (operationName, operation) => {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    
    const duration = performance.now() - startTime;
    ErrorReporting.logPerformance(operationName, duration, 'ms');
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    ErrorReporting.logPerformance(`${operationName}_failed`, duration, 'ms');
    
    throw error;
  }
};

/**
 * 9. USER FEEDBACK COLLECTION
 * Example of collecting user feedback on errors
 */
export const collectErrorFeedback = async (error, context) => {
  try {
    // Show feedback dialog (you would implement this UI)
    const userFeedback = await showFeedbackDialog({
      title: 'Pomóż nam ulepszyć aplikację',
      message: 'Wystąpił błąd. Czy możesz opisać co robiłeś gdy to się stało?',
      error: error.message,
    });

    if (userFeedback) {
      await ErrorReporting.captureUserFeedback(userFeedback, {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (feedbackError) {
    console.error('Error collecting feedback:', feedbackError);
  }
};

/**
 * 10. ERROR ANALYTICS AND REPORTING
 * Example of analyzing error patterns
 */
export const analyzeErrorPatterns = () => {
  const errorStats = ErrorReporting.getErrorStats();
  
  // Log error patterns for analysis
  console.log('Error Analysis:', {
    totalErrors: errorStats.totalErrors,
    mostCommonErrors: Object.entries(errorStats.byCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5),
    recentErrors: errorStats.recent.map(error => ({
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
    })),
  });

  // Send analytics to monitoring service
  if (!__DEV__) {
    sendErrorAnalytics(errorStats);
  }
};

/**
 * USAGE PATTERNS SUMMARY:
 * 
 * 1. Initialize all error handling systems at app startup
 * 2. Wrap API calls with enhanced error handling
 * 3. Use validation error handler for forms
 * 4. Implement offline support for critical operations
 * 5. Use appropriate fallback UI components for different scenarios
 * 6. Monitor performance and collect user feedback
 * 7. Analyze error patterns for continuous improvement
 * 
 * BEST PRACTICES:
 * 
 * - Always provide user-friendly error messages
 * - Implement graceful degradation for network issues
 * - Use appropriate retry strategies
 * - Collect enough context for debugging
 * - Test error scenarios thoroughly
 * - Monitor error patterns in production
 * - Provide offline functionality for core features
 * - Make error recovery as seamless as possible
 */

// Placeholder functions (you would implement these)
const addBookToServer = async (bookData) => { /* API call */ };
const fetchBooksFromServer = async () => { /* API call */ };
const checkISBNExists = async (isbn) => { /* Check ISBN */ };
const requestCameraPermission = async () => { /* Request permission */ };
const openAppSettings = async () => { /* Open settings */ };
const showFeedbackDialog = async (options) => { /* Show dialog */ };
const sendErrorAnalytics = (stats) => { /* Send analytics */ };
const LoadingComponent = () => <View />; // Your loading component

export default {
  initializeErrorHandling,
  AppWithErrorHandling,
  apiCallWithErrorHandling,
  addBookWithOfflineSupport,
  handleCameraPermission,
  monitoredOperation,
  collectErrorFeedback,
  analyzeErrorPatterns,
};