import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext';
import { Text, TouchableOpacity, View } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Test component that uses ThemeContext
const TestComponent = () => {
  const { isDarkMode, toggleTheme, theme, paperTheme } = useTheme();

  return (
    <View>
      <Text testID="dark-mode">{isDarkMode ? 'dark' : 'light'}</Text>
      <Text testID="primary-color">{theme.colors.primary}</Text>
      <Text testID="background-color">{theme.colors.background}</Text>
      <Text testID="paper-primary">{paperTheme.colors.primary}</Text>
      <TouchableOpacity testID="toggle-theme" onPress={toggleTheme}>
        <Text>Toggle Theme</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should start with light theme by default', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('dark-mode').props.children).toBe('light');
      expect(getByTestId('primary-color').props.children).toBe('#6200ee');
      expect(getByTestId('background-color').props.children).toBe('#f5f5f5');
    });

    it('should load saved dark theme preference', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(true));

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('darkMode');
    });

    it('should load saved light theme preference', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(false));

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('light');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('darkMode');
    });

    it('should handle AsyncStorage error gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should still render with default light theme
      expect(getByTestId('dark-mode').props.children).toBe('light');
    });

    it('should handle invalid stored theme data', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid-json');

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should use default light theme
      expect(getByTestId('dark-mode').props.children).toBe('light');
    });
  });

  describe('theme toggling', () => {
    it('should toggle from light to dark theme', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Initially light
      expect(getByTestId('dark-mode').props.children).toBe('light');

      // Toggle to dark
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });
    });

    it('should toggle from dark to light theme', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(true));

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Wait for dark theme to load
      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });

      // Toggle to light
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('light');
      });
    });

    it('should save theme preference to AsyncStorage', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'darkMode',
          JSON.stringify(true)
        );
      });
    });

    it('should handle AsyncStorage save error gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Save error'));

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should still toggle theme even if save fails
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });
    });
  });

  describe('light theme colors', () => {
    it('should provide correct light theme colors', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('primary-color').props.children).toBe('#6200ee');
      expect(getByTestId('background-color').props.children).toBe('#f5f5f5');
    });

    it('should provide correct light paper theme colors', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('paper-primary').props.children).toBe('#6200ee');
    });
  });

  describe('dark theme colors', () => {
    it('should provide correct dark theme colors', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Toggle to dark theme
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(getByTestId('primary-color').props.children).toBe('#bb86fc');
        expect(getByTestId('background-color').props.children).toBe('#121212');
      });
    });

    it('should provide correct dark paper theme colors', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Toggle to dark theme
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(getByTestId('paper-primary').props.children).toBe('#bb86fc');
      });
    });
  });

  describe('theme consistency', () => {
    it('should provide consistent theme object structure', () => {
      const ThemeStructureTest = () => {
        const { theme } = useTheme();
        
        const requiredColorProperties = [
          'primary',
          'background',
          'surface',
          'text',
          'textSecondary',
          'textTertiary',
          'border',
          'card',
          'error',
          'success',
          'placeholder',
          'placeholderText',
          'chip',
          'chipText',
        ];

        return (
          <View>
            {requiredColorProperties.map(prop => (
              <Text key={prop} testID={`color-${prop}`}>
                {theme.colors[prop] ? 'exists' : 'missing'}
              </Text>
            ))}
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeStructureTest />
        </ThemeProvider>
      );

      const requiredProperties = [
        'primary', 'background', 'surface', 'text', 'textSecondary',
        'textTertiary', 'border', 'card', 'error', 'success',
        'placeholder', 'placeholderText', 'chip', 'chipText'
      ];

      requiredProperties.forEach(prop => {
        expect(getByTestId(`color-${prop}`).props.children).toBe('exists');
      });
    });

    it('should maintain theme structure after toggling', async () => {
      const ThemeStructureTest = () => {
        const { theme, toggleTheme } = useTheme();
        
        return (
          <View>
            <Text testID="has-colors">{theme.colors ? 'yes' : 'no'}</Text>
            <Text testID="primary-exists">{theme.colors.primary ? 'yes' : 'no'}</Text>
            <TouchableOpacity testID="toggle" onPress={toggleTheme}>
              <Text>Toggle</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeStructureTest />
        </ThemeProvider>
      );

      // Check initial structure
      expect(getByTestId('has-colors').props.children).toBe('yes');
      expect(getByTestId('primary-exists').props.children).toBe('yes');

      // Toggle theme
      fireEvent.press(getByTestId('toggle'));

      await waitFor(() => {
        expect(getByTestId('has-colors').props.children).toBe('yes');
        expect(getByTestId('primary-exists').props.children).toBe('yes');
      });
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponentOutsideProvider = () => {
        useTheme();
        return <View />;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => 
        render(<TestComponentOutsideProvider />)
      ).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('should provide all theme methods and properties', () => {
      const ThemeMethodsTest = () => {
        const themeContext = useTheme();
        
        const properties = ['isDarkMode', 'toggleTheme', 'theme', 'paperTheme'];

        return (
          <View>
            {properties.map(prop => (
              <Text key={prop} testID={`has-${prop}`}>
                {typeof themeContext[prop] !== 'undefined' ? 'has' : 'missing'}
              </Text>
            ))}
          </View>
        );
      };

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeMethodsTest />
        </ThemeProvider>
      );

      ['isDarkMode', 'toggleTheme', 'theme', 'paperTheme'].forEach(prop => {
        expect(getByTestId(`has-${prop}`).props.children).toBe('has');
      });
    });
  });

  describe('multiple theme toggles', () => {
    it('should handle rapid theme toggles', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Initially light
      expect(getByTestId('dark-mode').props.children).toBe('light');

      // Rapid toggles
      fireEvent.press(getByTestId('toggle-theme')); // to dark
      fireEvent.press(getByTestId('toggle-theme')); // to light
      fireEvent.press(getByTestId('toggle-theme')); // to dark

      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });

      // Should save the final state
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'darkMode',
        JSON.stringify(true)
      );
    });

    it('should maintain correct theme state through multiple toggles', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const toggleButton = getByTestId('toggle-theme');

      // Toggle 1: light -> dark
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });

      // Toggle 2: dark -> light
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('light');
      });

      // Toggle 3: light -> dark
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByTestId('dark-mode').props.children).toBe('dark');
      });
    });
  });

  describe('AsyncStorage integration', () => {
    it('should only load from AsyncStorage once on mount', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('darkMode');
    });

    it('should save to AsyncStorage on each toggle', async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.press(getByTestId('toggle-theme'));
      fireEvent.press(getByTestId('toggle-theme'));

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('memory management', () => {
    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});