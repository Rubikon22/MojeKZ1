import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { STORAGE_KEYS } from '../constants';

const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: {},
  paperTheme: {},
});

// Set display name for debugging
ThemeContext.displayName = 'ThemeContext';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const lightTheme = {
  colors: {
    primary: '#6200ee',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
    textSecondary: '#757575',
    textTertiary: '#9e9e9e',
    border: '#e0e0e0',
    card: '#ffffff',
    error: '#f44336',
    success: '#4caf50',
    placeholder: '#e0e0e0',
    placeholderText: '#757575',
    chip: '#6200ee',
    chipText: '#ffffff',
  },
};

const darkTheme = {
  colors: {
    primary: '#bb86fc',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    textTertiary: '#666666',
    border: '#333333',
    card: '#1e1e1e',
    error: '#cf6679',
    success: '#81c784',
    placeholder: '#333333',
    placeholderText: '#b3b3b3',
    chip: '#bb86fc',
    chipText: '#000000',
  },
};

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    background: '#f5f5f5',
    surface: '#ffffff',
    onSurface: '#000000',
    onBackground: '#000000',
    error: '#f44336',
  },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    background: '#121212',
    surface: '#1e1e1e',
    onSurface: '#ffffff',
    onBackground: '#ffffff',
    error: '#cf6679',
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(newTheme));
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Revert the change if storage fails
      setIsDarkMode(isDarkMode);
    }
  }, [isDarkMode]);

  // Memoize theme objects to prevent unnecessary recalculations
  const theme = useMemo(() => isDarkMode ? darkTheme : lightTheme, [isDarkMode]);
  const paperTheme = useMemo(() => isDarkMode ? paperDarkTheme : paperLightTheme, [isDarkMode]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    isDarkMode,
    toggleTheme,
    theme,
    paperTheme,
    isLoading,
  }), [isDarkMode, toggleTheme, theme, paperTheme, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext };