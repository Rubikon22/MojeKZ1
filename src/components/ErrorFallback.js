import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import {
  Button,
  Card,
  IconButton,
  Chip,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useNetworkStatus } from '../utils/networkStatus';
import { useErrorReporting } from '../utils/errorReporting';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * ErrorFallback - Comprehensive error fallback UI components
 * Provides different fallback UIs for various error scenarios
 */

/**
 * Generic Error Fallback Component
 */
export const GenericErrorFallback = ({
  error,
  onRetry,
  onReset,
  onReport,
  showDetails = false,
  title = 'Wystąpił błąd',
  message = 'Przepraszamy, wystąpił nieoczekiwany błąd.',
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { theme } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { captureUserFeedback } = useErrorReporting();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReport = async () => {
    const feedback = await captureUserFeedback(
      'User reported error from fallback UI',
      {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }
    );
    onReport?.(feedback);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.errorCard} elevation={2}>
        <View style={styles.iconContainer}>
          <View style={[styles.errorIcon, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>

        {!isOnline && (
          <Chip
            icon="wifi-off"
            style={[styles.offlineChip, { backgroundColor: theme.colors.surface }]}
            textStyle={{ color: theme.colors.textSecondary }}
          >
            Brak połączenia z internetem
          </Chip>
        )}

        <View style={styles.actions}>
          {onRetry && (
            <Button
              mode="contained"
              onPress={handleRetry}
              disabled={isRetrying}
              style={styles.button}
              loading={isRetrying}
            >
              {isRetrying ? 'Ponawiam...' : 'Spróbuj ponownie'}
            </Button>
          )}

          {onReset && (
            <Button
              mode="outlined"
              onPress={onReset}
              style={styles.button}
            >
              Resetuj
            </Button>
          )}

          <Button
            mode="text"
            onPress={handleReport}
            style={styles.button}
            icon="bug"
          >
            Zgłoś problem
          </Button>
        </View>

        {showDetails && (
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowErrorDetails(!showErrorDetails)}
          >
            <Text style={[styles.detailsToggleText, { color: theme.colors.primary }]}>
              {showErrorDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
            </Text>
          </TouchableOpacity>
        )}

        {showErrorDetails && error && (
          <ScrollView style={styles.errorDetails}>
            <Text style={[styles.errorDetailsTitle, { color: theme.colors.text }]}>
              Szczegóły błędu:
            </Text>
            <Text style={[styles.errorDetailsText, { color: theme.colors.textSecondary }]}>
              {error.message}
            </Text>
            {error.stack && (
              <>
                <Text style={[styles.errorDetailsTitle, { color: theme.colors.text }]}>
                  Stack trace:
                </Text>
                <Text style={[styles.errorDetailsText, { color: theme.colors.textSecondary }]}>
                  {error.stack}
                </Text>
              </>
            )}
          </ScrollView>
        )}
      </Surface>
    </View>
  );
};

/**
 * Network Error Fallback
 */
export const NetworkErrorFallback = ({ onRetry, onOfflineMode }) => {
  const { theme } = useTheme();
  const { isOnline, connectionQuality } = useNetworkStatus();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.errorCard} elevation={2}>
        <View style={styles.iconContainer}>
          <Text style={styles.networkIcon}>📡</Text>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Problem z połączeniem
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {isOnline
            ? `Połączenie jest ${connectionQuality === 'poor' ? 'słabe' : 'niestabilne'}. Sprawdź połączenie z internetem.`
            : 'Brak połączenia z internetem. Sprawdź swoje połączenie WiFi lub dane mobilne.'
          }
        </Text>

        <View style={styles.networkStatus}>
          <Chip
            icon={isOnline ? "wifi" : "wifi-off"}
            style={[
              styles.statusChip,
              { backgroundColor: isOnline ? '#4caf50' : '#f44336' }
            ]}
            textStyle={{ color: '#ffffff' }}
          >
            {isOnline ? `Połączono (${connectionQuality})` : 'Brak połączenia'}
          </Chip>
        </View>

        <View style={styles.actions}>
          {onRetry && (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.button}
              icon="refresh"
            >
              Sprawdź ponownie
            </Button>
          )}

          {onOfflineMode && (
            <Button
              mode="outlined"
              onPress={onOfflineMode}
              style={styles.button}
              icon="cloud-off-outline"
            >
              Tryb offline
            </Button>
          )}
        </View>

        <View style={styles.tips}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
            Wskazówki:
          </Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            • Sprawdź połączenie WiFi lub dane mobilne
          </Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            • Spróbuj się przybliżyć do routera WiFi
          </Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            • Sprawdź czy masz wystarczający pakiet danych
          </Text>
        </View>
      </Surface>
    </View>
  );
};

/**
 * Data Loading Error Fallback
 */
export const DataLoadingErrorFallback = ({ 
  onRetry, 
  onRefresh, 
  dataType = 'dane',
  canUseCache = false,
  onUseCache,
}) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      await onRetry?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.errorCard} elevation={2}>
        <View style={styles.iconContainer}>
          <Text style={styles.dataIcon}>📁</Text>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          Nie udało się załadować {dataType}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          Wystąpił problem podczas ładowania danych. Sprawdź połączenie i spróbuj ponownie.
        </Text>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleRetry}
            disabled={isLoading}
            style={styles.button}
            icon="refresh"
            loading={isLoading}
          >
            Załaduj ponownie
          </Button>

          {onRefresh && (
            <Button
              mode="outlined"
              onPress={onRefresh}
              style={styles.button}
              icon="sync"
            >
              Odśwież
            </Button>
          )}

          {canUseCache && onUseCache && (
            <Button
              mode="text"
              onPress={onUseCache}
              style={styles.button}
              icon="cached"
            >
              Użyj danych lokalnych
            </Button>
          )}
        </View>
      </Surface>
    </View>
  );
};

/**
 * Empty State Fallback
 */
export const EmptyStateFallback = ({
  title = 'Brak danych',
  message = 'Nie znaleziono żadnych elementów.',
  icon = '📭',
  onAction,
  actionLabel = 'Dodaj',
  showAction = true,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateIcon}>{icon}</Text>
        
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>

        {showAction && onAction && (
          <Button
            mode="contained"
            onPress={onAction}
            style={[styles.button, styles.emptyStateButton]}
            icon="plus"
          >
            {actionLabel}
          </Button>
        )}
      </View>
    </View>
  );
};

/**
 * Permission Error Fallback
 */
export const PermissionErrorFallback = ({
  permission,
  onRequestPermission,
  onSkip,
  canSkip = true,
}) => {
  const { theme } = useTheme();

  const getPermissionInfo = (permission) => {
    const permissions = {
      camera: {
        icon: '📷',
        title: 'Dostęp do aparatu',
        message: 'Aplikacja potrzebuje dostępu do aparatu, aby robić zdjęcia okładek książek.',
        action: 'Udziel dostępu do aparatu',
      },
      storage: {
        icon: '💾',
        title: 'Dostęp do pamięci',
        message: 'Aplikacja potrzebuje dostępu do pamięci urządzenia, aby zapisywać zdjęcia.',
        action: 'Udziel dostępu do pamięci',
      },
      notifications: {
        icon: '🔔',
        title: 'Powiadomienia',
        message: 'Aplikacja może wysyłać powiadomienia o nowych książkach i przypomnieniach.',
        action: 'Włącz powiadomienia',
      },
    };

    return permissions[permission] || {
      icon: '🔒',
      title: 'Uprawnienia',
      message: 'Aplikacja potrzebuje dodatkowych uprawnień, aby działać poprawnie.',
      action: 'Udziel uprawnień',
    };
  };

  const permissionInfo = getPermissionInfo(permission);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.errorCard} elevation={2}>
        <View style={styles.iconContainer}>
          <Text style={styles.permissionIcon}>{permissionInfo.icon}</Text>
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {permissionInfo.title}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {permissionInfo.message}
        </Text>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={onRequestPermission}
            style={styles.button}
            icon="lock-open"
          >
            {permissionInfo.action}
          </Button>

          {canSkip && onSkip && (
            <Button
              mode="text"
              onPress={onSkip}
              style={styles.button}
            >
              Pomiń
            </Button>
          )}
        </View>

        <View style={styles.permissionNote}>
          <Text style={[styles.noteText, { color: theme.colors.textTertiary }]}>
            Możesz zmienić uprawnienia w ustawieniach urządzenia.
          </Text>
        </View>
      </Surface>
    </View>
  );
};

/**
 * Component Error Boundary Fallback
 */
export const ComponentErrorFallback = ({
  componentName,
  error,
  onRetry,
  onReset,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.componentError, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.componentErrorContent}>
        <Text style={[styles.componentErrorIcon]}>⚠️</Text>
        <Text style={[styles.componentErrorTitle, { color: theme.colors.text }]}>
          Błąd komponentu
        </Text>
        <Text style={[styles.componentErrorMessage, { color: theme.colors.textSecondary }]}>
          Komponent "{componentName}" nie może zostać wyświetlony.
        </Text>
        
        <View style={styles.componentErrorActions}>
          {onRetry && (
            <TouchableOpacity
              style={[styles.componentErrorButton, { borderColor: theme.colors.primary }]}
              onPress={onRetry}
            >
              <Text style={[styles.componentErrorButtonText, { color: theme.colors.primary }]}>
                Ponów
              </Text>
            </TouchableOpacity>
          )}
          
          {onReset && (
            <TouchableOpacity
              style={[styles.componentErrorButton, { borderColor: theme.colors.error }]}
              onPress={onReset}
            >
              <Text style={[styles.componentErrorButtonText, { color: theme.colors.error }]}>
                Reset
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    fontSize: 24,
    color: '#ffffff',
  },
  networkIcon: {
    fontSize: 48,
  },
  dataIcon: {
    fontSize: 48,
  },
  permissionIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  offlineChip: {
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  button: {
    marginVertical: 4,
  },
  detailsToggle: {
    marginTop: 16,
    padding: 8,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorDetails: {
    marginTop: 16,
    maxHeight: 200,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  errorDetailsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  networkStatus: {
    marginBottom: 16,
  },
  statusChip: {
    marginBottom: 8,
  },
  tips: {
    marginTop: 16,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    marginBottom: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateButton: {
    marginTop: 16,
  },
  permissionNote: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  noteText: {
    fontSize: 12,
    textAlign: 'center',
  },
  componentError: {
    padding: 16,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  componentErrorContent: {
    alignItems: 'center',
  },
  componentErrorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  componentErrorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  componentErrorMessage: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  componentErrorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  componentErrorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
  },
  componentErrorButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default GenericErrorFallback;