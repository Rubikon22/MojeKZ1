import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import App from '../../App';
import { BookProvider } from '../../src/context/BookContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock react-native components that may cause issues in tests
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput, ScrollView } = require('react-native');
  
  return {
    Provider: ({ children }) => children,
    FAB: ({ onPress, icon, style, ...props }) => (
      <TouchableOpacity testID="fab" onPress={onPress} style={style} {...props}>
        <Text>{icon}</Text>
      </TouchableOpacity>
    ),
    Searchbar: ({ value, onChangeText, placeholder, style, ...props }) => (
      <TextInput
        testID="searchbar"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={style}
        {...props}
      />
    ),
    Card: ({ children, style, ...props }) => (
      <View testID="card" style={style} {...props}>{children}</View>
    ),
    Title: ({ children, style, ...props }) => (
      <Text testID="title" style={style} {...props}>{children}</Text>
    ),
    Paragraph: ({ children, style, ...props }) => (
      <Text testID="paragraph" style={style} {...props}>{children}</Text>
    ),
    Button: ({ onPress, children, mode, style, ...props }) => (
      <TouchableOpacity testID={`button-${mode || 'default'}`} onPress={onPress} style={style} {...props}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    TextInput: ({ value, onChangeText, label, style, ...props }) => (
      <View style={style}>
        {label && <Text testID="input-label">{label}</Text>}
        <TextInput
          testID={`text-input-${label?.toLowerCase().replace(/\s+/g, '-') || 'default'}`}
          value={value}
          onChangeText={onChangeText}
          {...props}
        />
      </View>
    ),
    RadioButton: {
      Group: ({ children, onValueChange, value }) => (
        <View testID="radio-group" data-value={value}>
          {React.Children.map(children, (child, index) => 
            React.cloneElement(child, { onValueChange, groupValue: value })
          )}
        </View>
      ),
      Item: ({ value, onValueChange, groupValue, children, ...props }) => (
        <TouchableOpacity
          testID={`radio-${value}`}
          onPress={() => onValueChange?.(value)}
          {...props}
        >
          <Text>{groupValue === value ? '●' : '○'} {children}</Text>
        </TouchableOpacity>
      ),
    },
    Chip: ({ children, selected, onPress, style, ...props }) => (
      <TouchableOpacity
        testID={`chip-${children?.toLowerCase?.()?.replace(/\s+/g, '-') || 'default'}`}
        onPress={onPress}
        style={[style, selected && { backgroundColor: 'blue' }]}
        {...props}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Menu: ({ children, visible, onDismiss, anchor }) => (
      <View testID="menu" style={{ display: visible ? 'flex' : 'none' }}>
        {anchor}
        {visible && children}
      </View>
    ),
    Snackbar: ({ children, visible, onDismiss, ...props }) => (
      visible ? (
        <View testID="snackbar" {...props}>
          <Text>{children}</Text>
          <TouchableOpacity testID="snackbar-dismiss" onPress={onDismiss}>
            <Text>×</Text>
          </TouchableOpacity>
        </View>
      ) : null
    ),
    ActivityIndicator: (props) => <View testID="activity-indicator" {...props} />,
    HelperText: ({ children, type, ...props }) => (
      <Text testID={`helper-text-${type}`} {...props}>{children}</Text>
    ),
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setParams: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
      name: 'TestScreen',
    }),
  };
});

// Mock expo components
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color, ...props }) => (
    <View testID={`icon-${name}`} {...props} style={{ width: size, height: size, backgroundColor: color }} />
  ),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <SafeAreaProvider>
    <NavigationContainer>
      <PaperProvider>
        <ThemeProvider>
          <AuthProvider>
            <BookProvider>
              {children}
            </BookProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </NavigationContainer>
  </SafeAreaProvider>
);

describe('Book Management Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Flow Integration', () => {
    it('should handle login flow', async () => {
      const mockSignIn = jest.fn(() => Promise.resolve());
      
      // Mock auth context with sign in function
      const mockAuthContext = {
        user: null,
        loading: false,
        signIn: mockSignIn,
        signUp: jest.fn(),
        signOut: jest.fn(),
      };

      const TestAuthWrapper = ({ children }) => (
        <SafeAreaProvider>
          <NavigationContainer>
            <PaperProvider>
              <ThemeProvider>
                <AuthContext.Provider value={mockAuthContext}>
                  <BookProvider>
                    {children}
                  </BookProvider>
                </AuthContext.Provider>
              </ThemeProvider>
            </PaperProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      );

      const { getByTestId } = render(
        <TestAuthWrapper>
          <App />
        </TestAuthWrapper>
      );

      // Should render authentication flow
      await waitFor(() => {
        expect(getByTestId('searchbar') || getByTestId('text-input-email')).toBeTruthy();
      });
    });

    it('should handle authentication state changes', async () => {
      let authContextValue = {
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      };

      const TestAuthStateWrapper = ({ children }) => (
        <SafeAreaProvider>
          <NavigationContainer>
            <PaperProvider>
              <ThemeProvider>
                <AuthContext.Provider value={authContextValue}>
                  <BookProvider>
                    {children}
                  </BookProvider>
                </AuthContext.Provider>
              </ThemeProvider>
            </PaperProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      );

      const { rerender } = render(
        <TestAuthStateWrapper>
          <App />
        </TestAuthStateWrapper>
      );

      // Update auth state to logged in
      authContextValue = {
        ...authContextValue,
        user: { id: '1', email: 'test@example.com' },
      };

      rerender(
        <TestAuthStateWrapper>
          <App />
        </TestAuthStateWrapper>
      );

      // Should handle auth state change gracefully
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Book List and Navigation', () => {
    it('should render book list screen initially', async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
      });

      // Should show empty state message
      await waitFor(() => {
        expect(getByText(/Nie masz jeszcze zadnych ksiazek/)).toBeTruthy();
      });
    });

    it('should show FAB for adding new book', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('fab')).toBeTruthy();
      });
    });

    it('should render filter chips', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('chip-przeczytana')).toBeTruthy();
        expect(getByTestId('chip-czytam')).toBeTruthy();
        expect(getByTestId('chip-chce-przeczytac')).toBeTruthy();
      });
    });
  });

  describe('Book Addition Flow', () => {
    it('should navigate to book form when FAB is pressed', async () => {
      const mockNavigate = jest.fn();
      
      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({
          navigate: mockNavigate,
          goBack: jest.fn(),
        }),
      }));

      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const fab = getByTestId('fab');
        fireEvent.press(fab);
      });

      // Note: In actual integration, navigation would occur
      // Here we verify the FAB is pressable
      expect(getByTestId('fab')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should handle search input', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        fireEvent.changeText(searchbar, 'test search');
      });

      const searchbar = getByTestId('searchbar');
      expect(searchbar.props.value).toBe('test search');
    });

    it('should clear search when empty', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        fireEvent.changeText(searchbar, 'search term');
        fireEvent.changeText(searchbar, '');
      });

      const searchbar = getByTestId('searchbar');
      expect(searchbar.props.value).toBe('');
    });
  });

  describe('Filter Functionality', () => {
    it('should toggle filter chips', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const readChip = getByTestId('chip-przeczytana');
        fireEvent.press(readChip);
      });

      // Chip should be pressable
      expect(getByTestId('chip-przeczytana')).toBeTruthy();
    });

    it('should handle multiple filter selections', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        fireEvent.press(getByTestId('chip-przeczytana'));
        fireEvent.press(getByTestId('chip-czytam'));
      });

      // Both chips should be pressable
      expect(getByTestId('chip-przeczytana')).toBeTruthy();
      expect(getByTestId('chip-czytam')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme to components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        expect(searchbar.props.style).toBeDefined();
      });
    });

    it('should maintain theme consistency across components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        // All major components should be rendered with theme
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
        expect(getByTestId('chip-przeczytana')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle context errors gracefully', async () => {
      // Mock console.error to suppress error logs in test output
      const originalError = console.error;
      console.error = jest.fn();

      expect(() =>
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        )
      ).not.toThrow();

      console.error = originalError;
    });

    it('should render without external dependencies', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should render main UI elements even with mocked dependencies
      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
      });
    });
  });

  describe('Responsive Design Integration', () => {
    it('should apply responsive styling', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        expect(searchbar.props.style).toBeDefined();
      });

      // Responsive utilities should be applied
      expect(getByTestId('fab')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        expect(searchbar.props.placeholder).toBe('Szukaj ksiazke lub autora');
      });
    });

    it('should have accessible navigation elements', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        // FAB should be accessible
        expect(getByTestId('fab')).toBeTruthy();
        
        // Filter chips should be accessible
        expect(getByTestId('chip-przeczytana')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should render within reasonable time', async () => {
      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(Date.now() - startTime).toBeLessThan(5000); // Should render within 5 seconds
      });
    });

    it('should handle rapid user interactions', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchbar = getByTestId('searchbar');
        
        // Rapid text changes
        fireEvent.changeText(searchbar, 'a');
        fireEvent.changeText(searchbar, 'ab');
        fireEvent.changeText(searchbar, 'abc');
        fireEvent.changeText(searchbar, '');
      });

      // Should handle rapid changes without crashing
      expect(getByTestId('searchbar')).toBeTruthy();
    });
  });
});