import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Snackbar, Button, IconButton, Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { EnhancedErrorHandler } from '../utils/enhancedErrorHandler';

const { width: screenWidth } = Dimensions.get('window');

/**
 * ErrorNotification - User-friendly error display component
 * Provides different notification types: snackbar, banner, modal
 */
export const ErrorNotification = ({ type = 'snackbar' }) => {
  const [errors, setErrors] = useState([]);
  const [currentError, setCurrentError] = useState(null);
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = EnhancedErrorHandler.addListener((event, data) => {
      if (event === 'error' && !data.context?.silent) {
        setErrors(prev => [...prev, data]);
        
        if (!currentError) {
          showNextError();
        }
      }
    });

    return unsubscribe;
  }, [currentError]);

  const showNextError = () => {
    setErrors(prev => {
      if (prev.length > 0) {
        const [nextError, ...rest] = prev;
        setCurrentError(nextError);
        setVisible(true);
        return rest;
      }
      return prev;
    });
  };

  const hideError = () => {
    setVisible(false);
    setCurrentError(null);
    setTimeout(() => {
      showNextError();
    }, 300);
  };

  const handleRetry = async () => {
    if (currentError?.context?.retryFunction) {
      hideError();
      try {
        await currentError.context.retryFunction();
      } catch (error) {
        // Error will be handled by the enhanced error handler
      }
    } else {
      hideError();
    }
  };

  const handleAction = async () => {
    if (currentError?.context?.userActionFunction) {
      hideError();
      try {
        await currentError.context.userActionFunction();
      } catch (error) {
        // Error will be handled by the enhanced error handler
      }
    } else {
      hideError();
    }
  };

  if (!currentError || !visible) {
    return null;
  }

  switch (type) {
    case 'banner':
      return (
        <ErrorBanner
          error={currentError}
          onHide={hideError}
          onRetry={handleRetry}
          onAction={handleAction}
          theme={theme}
        />
      );
    
    case 'modal':
      return (
        <ErrorModal
          error={currentError}
          onHide={hideError}
          onRetry={handleRetry}
          onAction={handleAction}
          theme={theme}
        />
      );
    
    default:
      return (
        <ErrorSnackbar
          error={currentError}
          visible={visible}
          onHide={hideError}
          onRetry={handleRetry}
          onAction={handleAction}
          theme={theme}
        />
      );
  }
};

/**
 * Snackbar-style error notification
 */
const ErrorSnackbar = ({ error, visible, onHide, onRetry, onAction, theme }) => {
  const canRetry = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.RETRY;
  const needsUserAction = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.USER_ACTION;

  const action = canRetry ? {
    label: 'Ponów',
    onPress: onRetry,
  } : needsUserAction ? {
    label: error.context?.actionButtonText || 'Akcja',
    onPress: onAction,
  } : undefined;

  return (
    <Snackbar
      visible={visible}
      onDismiss={onHide}
      duration={6000}
      action={action}
      style={[
        styles.snackbar,
        { backgroundColor: getErrorColor(error.errorType, theme) }
      ]}
    >
      <Text style={[styles.snackbarText, { color: theme.colors.surface }]}>
        {error.userMessage.message}
      </Text>
    </Snackbar>
  );
};

/**
 * Banner-style error notification
 */
const ErrorBanner = ({ error, onHide, onRetry, onAction, theme }) => {
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const canRetry = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.RETRY;
  const needsUserAction = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.USER_ACTION;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: getErrorColor(error.errorType, theme),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: theme.colors.surface }]}>
            {error.userMessage.title}
          </Text>
          <Text style={[styles.bannerMessage, { color: theme.colors.surface }]}>
            {error.userMessage.message}
          </Text>
        </View>
        
        <View style={styles.bannerActions}>
          {(canRetry || needsUserAction) && (
            <TouchableOpacity
              style={[styles.bannerButton, { borderColor: theme.colors.surface }]}
              onPress={canRetry ? onRetry : onAction}
            >
              <Text style={[styles.bannerButtonText, { color: theme.colors.surface }]}>
                {canRetry ? 'Ponów' : (error.context?.actionButtonText || 'Akcja')}
              </Text>
            </TouchableOpacity>
          )}
          
          <IconButton
            icon="close"
            iconColor={theme.colors.surface}
            size={20}
            onPress={onHide}
          />
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Modal-style error notification
 */
const ErrorModal = ({ error, onHide, onRetry, onAction, theme }) => {
  const scaleAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const canRetry = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.RETRY;
  const needsUserAction = error.recoveryStrategy === EnhancedErrorHandler.RECOVERY_STRATEGIES.USER_ACTION;
  const hasFallback = !!error.context?.fallbackFunction;

  return (
    <View style={styles.modalOverlay}>
      <Animated.View
        style={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.surface,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Surface style={styles.modalContent} elevation={4}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {error.userMessage.title}
            </Text>
            <View style={[
              styles.errorTypeIndicator,
              { backgroundColor: getErrorColor(error.errorType, theme) }
            ]} />
          </View>
          
          <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
            {error.userMessage.message}
          </Text>

          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={[styles.debugTitle, { color: theme.colors.textTertiary }]}>
                Debug Info:
              </Text>
              <Text style={[styles.debugText, { color: theme.colors.textTertiary }]}>
                Type: {error.errorType}
              </Text>
              <Text style={[styles.debugText, { color: theme.colors.textTertiary }]}>
                Strategy: {error.recoveryStrategy}
              </Text>
            </View>
          )}

          <View style={styles.modalActions}>
            {hasFallback && (
              <Button
                mode="outlined"
                onPress={async () => {
                  onHide();
                  try {
                    await error.context.fallbackFunction();
                  } catch (fallbackError) {
                    // Handle fallback error
                  }
                }}
                style={styles.modalButton}
              >
                Tryb offline
              </Button>
            )}
            
            {(canRetry || needsUserAction) && (
              <Button
                mode="contained"
                onPress={canRetry ? onRetry : onAction}
                style={styles.modalButton}
              >
                {canRetry ? 'Spróbuj ponownie' : (error.context?.actionButtonText || 'Wykonaj akcję')}
              </Button>
            )}
            
            <Button
              mode="text"
              onPress={onHide}
              style={styles.modalButton}
            >
              Anuluj
            </Button>
          </View>
        </Surface>
      </Animated.View>
    </View>
  );
};

/**
 * Get error color based on error type
 */
const getErrorColor = (errorType, theme) => {
  switch (errorType) {
    case EnhancedErrorHandler.ERROR_TYPES.NETWORK:
      return '#ff9800'; // Orange for network issues
    case EnhancedErrorHandler.ERROR_TYPES.API:
      return '#f44336'; // Red for API errors
    case EnhancedErrorHandler.ERROR_TYPES.AUTHENTICATION:
      return '#9c27b0'; // Purple for auth errors
    case EnhancedErrorHandler.ERROR_TYPES.VALIDATION:
      return '#ff5722'; // Deep orange for validation
    case EnhancedErrorHandler.ERROR_TYPES.STORAGE:
      return '#795548'; // Brown for storage issues
    case EnhancedErrorHandler.ERROR_TYPES.PERMISSION:
      return '#607d8b'; // Blue grey for permissions
    default:
      return theme.colors.error || '#f44336';
  }
};

/**
 * Offline notification banner
 */
export const OfflineNotification = () => {
  const [isOffline, setIsOffline] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = EnhancedErrorHandler.addListener((event) => {
      if (event === 'offline_mode_enabled') {
        setIsOffline(true);
      }
    });

    return unsubscribe;
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.offlineBanner, { backgroundColor: '#607d8b' }]}>
      <Text style={[styles.offlineText, { color: '#ffffff' }]}>
        📱 Tryb offline - niektóre funkcje mogą być ograniczone
      </Text>
      <TouchableOpacity
        onPress={() => setIsOffline(false)}
        style={styles.offlineClose}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Connection status indicator
 */
export const ConnectionStatus = () => {
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const { theme } = useTheme();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { NetworkStatus } = await import('../utils/networkStatus');
        const quality = await NetworkStatus.getConnectionQuality();
        setConnectionQuality(quality);
      } catch (error) {
        console.log('Error checking connection:', error);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => clearInterval(interval);
  }, []);

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return '#4caf50';
      case 'good':
        return '#ff9800';
      case 'poor':
        return '#f44336';
      case 'offline':
        return '#757575';
      default:
        return theme.colors.textTertiary;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return '📶';
      case 'good':
        return '📶';
      case 'poor':
        return '📶';
      case 'offline':
        return '📵';
      default:
        return '❓';
    }
  };

  if (connectionQuality === 'excellent' || connectionQuality === 'unknown') {
    return null; // Don't show indicator for good connections
  }

  return (
    <View style={[styles.connectionStatus, { backgroundColor: getConnectionColor() }]}>
      <Text style={styles.connectionText}>
        {getConnectionIcon()} {connectionQuality === 'offline' ? 'Offline' : 'Słabe połączenie'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Snackbar styles
  snackbar: {
    margin: 16,
    borderRadius: 8,
  },
  snackbarText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Banner styles
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    opacity: 0.9,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  bannerButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  errorTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  debugInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalButton: {
    marginLeft: 8,
  },

  // Offline notification styles
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  offlineClose: {
    padding: 4,
  },

  // Connection status styles
  connectionStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 16,
    zIndex: 999,
  },
  connectionText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ErrorNotification;