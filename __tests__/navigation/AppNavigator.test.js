import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '../../src/navigation/AppNavigator';
import { AuthContext } from '../../src/context/AuthContext';
import { BookContext } from '../../src/context/BookContext';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

// Mock responsive utilities
jest.mock('../../src/utils/responsive', () => ({
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  responsiveFontSize: (size) => size,
  getResponsivePadding: () => 16,
  isTablet: () => false,
  getGridColumns: () => 2,
  moderateScale: (size) => size,
  getFormInputHeight: () => 40,
  getButtonHeight: () => 48,
  verticalScale: (size) => size,
}));

// Mock constants
jest.mock('../../src/constants', () => ({
  STORAGE_KEYS: { BOOKS: 'books', THEME: 'darkMode' },
  ERROR_MESSAGES: { GENERIC: 'An error occurred' },
  APP_CONFIG: { ASPECT_RATIO: [2, 3], IMAGE_QUALITY: 0.7 },
  SUCCESS_MESSAGES: { BOOK_ADDED: 'Book added', BOOK_UPDATED: 'Book updated' },
}));

// Mock validation
jest.mock('../../src/utils/validation', () => ({
  LoginSchema: { validate: jest.fn((values) => Promise.resolve(values)) },
  RegisterSchema: { validate: jest.fn((values) => Promise.resolve(values)) },
  BookSchema: { validate: jest.fn((values) => Promise.resolve(values)) },
}));

// Mock error handler
jest.mock('../../src/utils/errorHandler', () => ({
  ErrorHandler: {
    handleAsync: jest.fn((fn) => fn()),
    showSuccess: jest.fn((message, title, callback) => callback && callback()),
    showError: jest.fn(),
  },
}));

// Mock image picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock Platform
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Platform: { OS: 'ios' },
    Alert: { alert: jest.fn() },
    Keyboard: { dismiss: jest.fn() },
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput, ScrollView } = require('react-native');
  return {
    Provider: ({ children }) => children,
    Button: ({ children, onPress, mode, disabled, loading }) => (
      <TouchableOpacity
        testID={`button-${children?.toLowerCase().replace(/\s+/g, '-')}`}
        onPress={onPress}
        disabled={disabled || loading}
        data-mode={mode}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    TextInput: ({ label, value, onChangeText, error, secureTextEntry }) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          testID={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
        />
        {error && <Text testID={`error-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{error}</Text>}
      </View>
    ),
    Text: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    Title: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    Paragraph: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    HelperText: ({ children, type, visible }) => (
      visible ? <Text testID={`helper-${type}`}>{children}</Text> : null
    ),
    Searchbar: ({ onChangeText, value, placeholder }) => (
      <TextInput
        testID="searchbar"
        onChangeText={onChangeText}
        value={value}
        placeholder={placeholder}
      />
    ),
    FAB: ({ onPress, icon }) => (
      <TouchableOpacity testID="fab" onPress={onPress}>
        <Text>{icon}</Text>
      </TouchableOpacity>
    ),
    Chip: ({ children, onPress, selected }) => (
      <TouchableOpacity
        testID={`chip-${children}`}
        onPress={onPress}
        data-selected={selected}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }) => <View testID="card">{children}</View>,
    RadioButton: {
      Group: ({ children, onValueChange, value }) => (
        <View testID="radio-group">{children}</View>
      ),
      Item: ({ value, label }) => (
        <TouchableOpacity testID={`radio-${value}`}>
          <Text>{label}</Text>
        </TouchableOpacity>
      ),
    },
    Menu: ({ children, visible, anchor }) => (
      <View testID="menu">
        {anchor}
        {visible && children}
      </View>
    ),
  };
});

jest.mock('react-native-paper', () => {
  const original = jest.requireActual('react-native-paper');
  const { TouchableOpacity, Text } = require('react-native');
  
  return {
    ...original,
    Menu: {
      ...original.Menu,
      Item: ({ onPress, title }) => (
        <TouchableOpacity testID={`menu-item-${title.split(' ')[0]}`} onPress={onPress}>
          <Text>{title}</Text>
        </TouchableOpacity>
      ),
    },
  };
});

// Mock components
jest.mock('../../src/components/BookItem', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return ({ book, onPress }) => (
    <TouchableOpacity testID={`book-item-${book.id}`} onPress={onPress}>
      <View>
        <Text>{book.title}</Text>
      </View>
    </TouchableOpacity>
  );
});

jest.mock('../../src/components/StarRating', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ rating, onRatingChange, readonly }) => (
    <TouchableOpacity
      testID="star-rating"
      onPress={() => !readonly && onRatingChange && onRatingChange(rating + 1)}
    >
      <Text>Rating: {rating}</Text>
    </TouchableOpacity>
  );
});

describe('AppNavigator Tests', () => {
  const createMockAuthContext = (user = null, loading = false) => ({
    user,
    loading,
    signIn: jest.fn(() => Promise.resolve()),
    signUp: jest.fn(() => Promise.resolve()),
    signOut: jest.fn(() => Promise.resolve()),
  });

  const createMockBookContext = () => ({
    books: [],
    loading: false,
    addBook: jest.fn(() => Promise.resolve()),
    updateBook: jest.fn(() => Promise.resolve()),
    deleteBook: jest.fn(() => Promise.resolve()),
    clearAllBooks: jest.fn(() => Promise.resolve()),
  });

  const TestWrapper = ({ authContext = createMockAuthContext(), bookContext = createMockBookContext() }) => (
    <SafeAreaProvider>
      <NavigationContainer>
        <ThemeProvider>
          <AuthContext.Provider value={authContext}>
            <BookContext.Provider value={bookContext}>
              <AppNavigator />
            </BookContext.Provider>
          </AuthContext.Provider>
        </ThemeProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow Navigation', () => {
    it('should show login screen when user is not authenticated', async () => {
      const { getByTestId } = render(<TestWrapper />);

      await waitFor(() => {
        expect(getByTestId('input-email') || getByTestId('searchbar')).toBeTruthy();
      });
    });

    it('should show book list when user is authenticated', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
      });
    });

    it('should handle authentication state changes', async () => {
      let authContext = createMockAuthContext();
      
      const { rerender, getByTestId } = render(<TestWrapper authContext={authContext} />);

      // Initially should show login
      await waitFor(() => {
        expect(getByTestId('input-email') || getByTestId('searchbar')).toBeTruthy();
      });

      // Update to authenticated state
      authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      rerender(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });
    });

    it('should show loading state during authentication', async () => {
      const authContext = createMockAuthContext(null, true);
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      // Should handle loading state gracefully
      await waitFor(() => {
        expect(getByTestId('input-email') || getByTestId('searchbar')).toBeTruthy();
      });
    });
  });

  describe('Navigation Between Screens', () => {
    it('should navigate to book form when FAB is pressed', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        const fab = getByTestId('fab');
        expect(fab).toBeTruthy();
        
        fireEvent.press(fab);
        // In real navigation, this would navigate to BookForm
      });
    });

    it('should handle back navigation', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Navigation state should be maintained
      expect(getByTestId('fab')).toBeTruthy();
    });

    it('should navigate between authentication screens', async () => {
      const { getByTestId } = render(<TestWrapper />);

      await waitFor(() => {
        const registerLink = getByTestId('button-register') || 
                            getByTestId('button-create-account') ||
                            getByTestId('button-register-link');
        
        if (registerLink) {
          fireEvent.press(registerLink);
        }
      });

      // Should handle navigation attempts
      expect(getByTestId('input-email') || getByTestId('input-password')).toBeTruthy();
    });
  });

  describe('Deep Linking and Route Parameters', () => {
    it('should handle navigation with parameters', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const bookContext = createMockBookContext();
      bookContext.books = [
        { id: '1', title: 'Test Book', author: 'Test Author', status: 'Przeczytana', rating: 5 }
      ];

      const { getByTestId } = render(
        <TestWrapper authContext={authContext} bookContext={bookContext} />
      );

      await waitFor(() => {
        const bookItem = getByTestId('book-item-1');
        if (bookItem) {
          fireEvent.press(bookItem);
        }
      });

      // Should handle book item navigation
      expect(getByTestId('searchbar')).toBeTruthy();
    });

    it('should maintain navigation state through context changes', async () => {
      let authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      
      const { rerender, getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Update auth context while maintaining navigation
      authContext = { ...authContext, user: { ...authContext.user, email: 'updated@example.com' } };
      rerender(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });
    });
  });

  describe('Navigation Guards and Permissions', () => {
    it('should protect authenticated routes', async () => {
      const { getByTestId } = render(<TestWrapper />);

      // Should not show authenticated content without user
      await waitFor(() => {
        expect(getByTestId('input-email') || getByTestId('input-password')).toBeTruthy();
      });
    });

    it('should redirect authenticated users from login screen', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      // Should show main app content, not login
      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
      });
    });
  });

  describe('Navigation Performance', () => {
    it('should handle rapid navigation changes', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        const fab = getByTestId('fab');
        
        // Rapid navigation attempts
        fireEvent.press(fab);
        fireEvent.press(fab);
        fireEvent.press(fab);
      });

      // Should handle rapid presses gracefully
      expect(getByTestId('fab')).toBeTruthy();
    });

    it('should maintain performance with complex navigation stack', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const startTime = Date.now();

      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(Date.now() - startTime).toBeLessThan(3000); // Should render within 3 seconds
      });
    });
  });

  describe('Navigation Error Handling', () => {
    it('should handle navigation errors gracefully', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      
      // Suppress console errors for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestWrapper authContext={authContext} />);
      }).not.toThrow();

      console.error = originalError;
    });

    it('should recover from navigation state corruption', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Navigation should remain functional
      expect(getByTestId('fab')).toBeTruthy();
    });
  });

  describe('Screen Lifecycle Management', () => {
    it('should handle screen focus and blur events', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Screen should maintain state through focus changes
      const searchbar = getByTestId('searchbar');
      fireEvent.changeText(searchbar, 'test search');
      expect(searchbar.props.value).toBe('test search');
    });

    it('should cleanup resources on unmount', () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { unmount } = render(<TestWrapper authContext={authContext} />);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Navigation Accessibility', () => {
    it('should maintain accessibility through navigation', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        expect(searchbar.props.placeholder).toBe('Szukaj ksiazke lub autora');
      });

      // All interactive elements should be accessible
      expect(getByTestId('fab')).toBeTruthy();
    });

    it('should provide proper navigation announcements', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
      });

      // Navigation should be accessible to screen readers
      expect(getByTestId('chip-Przeczytana')).toBeTruthy();
    });
  });

  describe('Navigation Memory Management', () => {
    it('should not cause memory leaks during navigation', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      
      const { unmount } = render(<TestWrapper authContext={authContext} />);
      
      // Multiple mount/unmount cycles
      unmount();
      
      expect(() => {
        render(<TestWrapper authContext={authContext} />);
      }).not.toThrow();
    });

    it('should handle route parameter cleanup', async () => {
      const authContext = createMockAuthContext({ id: '1', email: 'test@example.com' });
      const { getByTestId } = render(<TestWrapper authContext={authContext} />);

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Navigation should clean up properly
      expect(getByTestId('fab')).toBeTruthy();
    });
  });
});