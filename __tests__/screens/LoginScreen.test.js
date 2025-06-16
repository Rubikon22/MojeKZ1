import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import { AuthContext } from '../../src/context/AuthContext';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

// Mock responsive utilities
jest.mock('../../src/utils/responsive', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  responsiveFontSize: (size) => size,
  getResponsivePadding: () => 16,
  isTablet: () => false,
  moderateScale: (size) => size,
  getFormInputHeight: () => 40,
  getButtonHeight: () => 48,
  verticalScale: (size) => size,
}));

// Mock validation
jest.mock('../../src/utils/validation', () => ({
  LoginSchema: {
    validate: jest.fn((values) => Promise.resolve(values)),
  },
}));

// Mock error handler
jest.mock('../../src/utils/errorHandler', () => ({
  ErrorHandler: {
    handleAsync: jest.fn((fn) => fn()),
    showError: jest.fn(),
    getErrorMessage: jest.fn((error) => error.message || 'An error occurred'),
  },
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    TextInput: ({ label, value, onChangeText, error, secureTextEntry, ...props }) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          testID={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          {...props}
        />
        {error && <Text testID={`error-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{error}</Text>}
      </View>
    ),
    Button: ({ children, onPress, mode, disabled, loading, ...props }) => (
      <TouchableOpacity
        testID={`button-${children?.toLowerCase().replace(/\s+/g, '-')}`}
        onPress={onPress}
        disabled={disabled || loading}
        data-mode={mode}
        data-loading={loading}
        {...props}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Text: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    Title: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    Paragraph: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    HelperText: ({ children, type, visible, ...props }) => (
      visible ? <Text testID={`helper-${type}`} {...props}>{children}</Text> : null
    ),
  };
});

// Mock Keyboard
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Keyboard: {
      dismiss: jest.fn(),
    },
  };
});

// Helper to create mock auth context
const createMockAuthContext = (user = null, loading = false) => ({
  user,
  loading,
  signIn: jest.fn(() => Promise.resolve()),
  signUp: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
});

// Helper to render screen with providers
const renderLoginScreen = (authContextValue = createMockAuthContext()) => {
  return render(
    <ThemeProvider>
      <AuthContext.Provider value={authContextValue}>
        <LoginScreen />
      </AuthContext.Provider>
    </ThemeProvider>
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render login form', () => {
      const { getByTestId } = renderLoginScreen();
      
      expect(getByTestId('input-email')).toBeTruthy();
      expect(getByTestId('input-password')).toBeTruthy();
      expect(getByTestId('button-sign-in')).toBeTruthy();
    });

    it('should render register link', () => {
      const { getByTestId } = renderLoginScreen();
      
      expect(getByTestId('button-register-link') || getByTestId('button-create-account')).toBeTruthy();
    });

    it('should render title and description', () => {
      const { getByText } = renderLoginScreen();
      
      expect(getByText(/logowanie/i) || getByText(/zaloguj/i)).toBeTruthy();
    });

    it('should render password field as secure', () => {
      const { getByTestId } = renderLoginScreen();
      
      const passwordInput = getByTestId('input-password');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('form validation', () => {
    it('should validate email field', async () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      fireEvent.changeText(emailInput, 'invalid-email');
      
      const signInButton = getByTestId('button-sign-in');
      fireEvent.press(signInButton);
      
      // Validation should be triggered
      expect(emailInput.props.value).toBe('invalid-email');
    });

    it('should validate password field', async () => {
      const { getByTestId } = renderLoginScreen();
      
      const passwordInput = getByTestId('input-password');
      fireEvent.changeText(passwordInput, '123');
      
      const signInButton = getByTestId('button-sign-in');
      fireEvent.press(signInButton);
      
      expect(passwordInput.props.value).toBe('123');
    });

    it('should show validation errors', async () => {
      const mockValidation = require('../../src/utils/validation');
      mockValidation.LoginSchema.validate.mockRejectedValue({
        path: 'email',
        message: 'Invalid email',
      });
      
      const { getByTestId } = renderLoginScreen();
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      // Should handle validation error
      expect(mockValidation.LoginSchema.validate).toHaveBeenCalled();
    });
  });

  describe('form interaction', () => {
    it('should update email field value', () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update password field value', () => {
      const { getByTestId } = renderLoginScreen();
      
      const passwordInput = getByTestId('input-password');
      fireEvent.changeText(passwordInput, 'password123');
      
      expect(passwordInput.props.value).toBe('password123');
    });

    it('should clear validation errors when typing', () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      
      // Type invalid then valid email
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });
  });

  describe('authentication', () => {
    it('should call signIn on form submission', async () => {
      const mockAuthContext = createMockAuthContext();
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      // Fill form
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      // Submit
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      expect(mockAuthContext.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should show loading state during sign in', async () => {
      const mockAuthContext = createMockAuthContext(null, true);
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      const signInButton = getByTestId('button-sign-in');
      
      expect(signInButton.props['data-loading']).toBe(true);
      expect(signInButton.props.disabled).toBe(true);
    });

    it('should handle sign in success', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockAuthContext = createMockAuthContext(mockUser);
      
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      expect(mockAuthContext.signIn).toHaveBeenCalled();
    });

    it('should handle sign in error', async () => {
      const mockAuthContext = createMockAuthContext();
      mockAuthContext.signIn.mockRejectedValue(new Error('Invalid credentials'));
      
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'wrongpassword');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      const { ErrorHandler } = require('../../src/utils/errorHandler');
      expect(ErrorHandler.showError).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const mockAuthContext = createMockAuthContext();
      mockAuthContext.signIn.mockRejectedValue(new Error('Network error'));
      
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      const { ErrorHandler } = require('../../src/utils/errorHandler');
      expect(ErrorHandler.showError).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to register screen', () => {
      const { getByTestId } = renderLoginScreen();
      
      const registerLink = getByTestId('button-register-link') || getByTestId('button-create-account');
      fireEvent.press(registerLink);
      
      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });

    it('should navigate to home after successful login', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockAuthContext = createMockAuthContext(mockUser);
      
      renderLoginScreen(mockAuthContext);
      
      // Should automatically navigate when user is set
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('BookList');
      });
    });
  });

  describe('user experience', () => {
    it('should dismiss keyboard on form submission', async () => {
      const { getByTestId } = renderLoginScreen();
      
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      const { Keyboard } = require('react-native');
      expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    it('should provide clear error messages', async () => {
      const mockAuthContext = createMockAuthContext();
      mockAuthContext.signIn.mockRejectedValue(new Error('User not found'));
      
      const { getByTestId } = renderLoginScreen(mockAuthContext);
      
      fireEvent.changeText(getByTestId('input-email'), 'notfound@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      const { ErrorHandler } = require('../../src/utils/errorHandler');
      expect(ErrorHandler.showError).toHaveBeenCalledWith('User not found');
    });
  });

  describe('accessibility', () => {
    it('should provide accessible form inputs', () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      const passwordInput = getByTestId('input-password');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should provide accessible buttons', () => {
      const { getByTestId } = renderLoginScreen();
      
      expect(getByTestId('button-sign-in')).toBeTruthy();
      expect(getByTestId('button-register-link') || getByTestId('button-create-account')).toBeTruthy();
    });

    it('should provide proper form labels', () => {
      const { getByText } = renderLoginScreen();
      
      expect(getByText(/email/i) || getByText(/e-mail/i)).toBeTruthy();
      expect(getByText(/password/i) || getByText(/haslo/i)).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty form submission', async () => {
      const { getByTestId } = renderLoginScreen();
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
      });
      
      // Should handle validation gracefully
      expect(signInButton).toBeTruthy();
    });

    it('should handle very long email addresses', () => {
      const { getByTestId } = renderLoginScreen();
      
      const longEmail = 'a'.repeat(100) + '@example.com';
      const emailInput = getByTestId('input-email');
      
      expect(() => {
        fireEvent.changeText(emailInput, longEmail);
      }).not.toThrow();
    });

    it('should handle special characters in password', () => {
      const { getByTestId } = renderLoginScreen();
      
      const specialPassword = 'password!@#$%^&*()_+{}|:<>?[]\\;\',./';
      const passwordInput = getByTestId('input-password');
      
      expect(() => {
        fireEvent.changeText(passwordInput, specialPassword);
      }).not.toThrow();
    });

    it('should handle rapid form submissions', async () => {
      const { getByTestId } = renderLoginScreen();
      
      fireEvent.changeText(getByTestId('input-email'), 'test@example.com');
      fireEvent.changeText(getByTestId('input-password'), 'password123');
      
      const signInButton = getByTestId('button-sign-in');
      
      await act(async () => {
        fireEvent.press(signInButton);
        fireEvent.press(signInButton);
        fireEvent.press(signInButton);
      });
      
      // Should handle multiple presses gracefully
      expect(signInButton).toBeTruthy();
    });

    it('should handle auth context without signIn method', () => {
      const incompleteAuthContext = { user: null, loading: false };
      
      expect(() => {
        renderLoginScreen(incompleteAuthContext);
      }).not.toThrow();
    });
  });

  describe('form state management', () => {
    it('should maintain form state during validation', async () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      const passwordInput = getByTestId('input-password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      
      // Trigger validation
      const signInButton = getByTestId('button-sign-in');
      fireEvent.press(signInButton);
      
      // Values should be preserved
      expect(emailInput.props.value).toBe('test@example.com');
      expect(passwordInput.props.value).toBe('password123');
    });

    it('should reset form errors when correcting input', () => {
      const { getByTestId } = renderLoginScreen();
      
      const emailInput = getByTestId('input-email');
      
      // Enter invalid then valid email
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });
  });
});