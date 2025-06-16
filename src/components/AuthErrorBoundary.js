import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

/**
 * Authentication Error Boundary
 * Catches and handles authentication-related initialization errors
 */
class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log the error for debugging
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <AuthErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Authentication Error Fallback UI Component
 */
const AuthErrorFallback = ({ error, onRetry, onReset, retryCount, maxRetries }) => {
  const { theme } = useTheme();

  const getErrorMessage = () => {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('books') && errorMessage.includes('undefined')) {
      return {
        title: 'Błąd inicjalizacji danych',
        message: 'Wystąpił problem podczas ładowania danych użytkownika. Spróbuj ponownie lub zrestartuj aplikację.',
        suggestion: 'Ten błąd może wystąpić przy pierwszym uruchomieniu aplikacji.',
      };
    }
    
    if (errorMessage.includes('auth') || errorMessage.includes('session')) {
      return {
        title: 'Błąd uwierzytelniania',
        message: 'Wystąpił problem z systemem uwierzytelniania. Sprawdź połączenie z internetem.',
        suggestion: 'Upewnij się, że masz aktywne połączenie z internetem.',
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        title: 'Błąd połączenia',
        message: 'Nie można połączyć się z serwerem. Sprawdź połączenie z internetem.',
        suggestion: 'Sprawdź ustawienia WiFi lub danych mobilnych.',
      };
    }
    
    return {
      title: 'Błąd aplikacji',
      message: 'Wystąpił nieoczekiwany błąd podczas uruchamiania aplikacji.',
      suggestion: 'Spróbuj ponownie lub zrestartuj aplikację.',
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.errorCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>

        {/* Error Title */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {errorInfo.title}
        </Text>

        {/* Error Message */}
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {errorInfo.message}
        </Text>

        {/* Suggestion */}
        <View style={[styles.suggestionContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Text style={[styles.suggestionText, { color: theme.colors.primary }]}>
            💡 {errorInfo.suggestion}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {retryCount < maxRetries && (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.button}
              icon="refresh"
            >
              Spróbuj ponownie ({retryCount + 1}/{maxRetries})
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={onReset}
            style={styles.button}
            icon="restart"
          >
            Zrestartuj aplikację
          </Button>
        </View>

        {/* Debug Information (Development only) */}
        {__DEV__ && error && (
          <View style={[styles.debugContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.debugTitle, { color: theme.colors.text }]}>
              Debug Info (tylko w trybie deweloperskim):
            </Text>
            <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
              {error.message}
            </Text>
            {error.stack && (
              <Text style={[styles.debugStack, { color: theme.colors.textTertiary }]}>
                {error.stack.split('\n').slice(0, 5).join('\n')}
              </Text>
            )}
          </View>
        )}
      </Surface>
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
    marginBottom: 16,
  },
  suggestionContainer: {
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  suggestionText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  button: {
    marginVertical: 4,
  },
  debugContainer: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  debugStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 12,
  },
});

export default AuthErrorBoundary;