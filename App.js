/**
 * MojeKZ - Aplikacja do zarządzania księgozbiorem
 * 
 * Główny komponent aplikacji zawierający:
 * - Konfigurację dostawców kontekstu (Context Providers)
 * - Inicjalizację nawigacji i motywów
 * - Obsługę błędów na poziomie aplikacji
 * - Konfigurację React Native Paper UI
 * 
 * Architektura Context Providers (od zewnętrznego do wewnętrznego):
 * 1. AuthErrorBoundary - Globalny error boundary
 * 2. ThemeProvider - Zarządzanie motywami (jasny/ciemny)
 * 3. SafeAreaProvider - Bezpieczne obszary urządzenia
 * 4. PaperProvider - UI komponenty Material Design
 * 5. AuthProvider - Autoryzacja i uwierzytelnianie
 * 6. OptimizedBookProvider - Zarządzanie księgozbiorem
 * 7. NavigationContainer - Nawigacja między ekranami
 * 
 * @author MojeKZ Team
 * @version 2.0
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { OptimizedBookProvider } from './src/context/OptimizedBookContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthErrorBoundary from './src/components/AuthErrorBoundary';

/**
 * AppContent - Główna zawartość aplikacji z dostępem do motywu
 * Komponenty uporządkowane zgodnie z architekturą Context Providers
 */
const AppContent = () => {
  // Pobieranie aktualnego motywu z ThemeContext
  const { theme, isDarkMode, paperTheme } = useTheme();

  return (
    <SafeAreaProvider>
      {/* Material Design komponenty UI */}
      <PaperProvider theme={paperTheme}>
        {/* Error boundary dla błędów autoryzacji */}
        <AuthErrorBoundary>
          {/* Kontekst autoryzacji użytkownika */}
          <AuthProvider>
            {/* Zoptymalizowany kontekst zarządzania książkami */}
            <OptimizedBookProvider>
              {/* Kontener nawigacji React Navigation */}
              <NavigationContainer>
                {/* Konfiguracja paska statusu zgodnie z motywem */}
                <StatusBar 
                  barStyle={isDarkMode ? "light-content" : "dark-content"} 
                  backgroundColor={theme.colors.primary} 
                />
                {/* Główny navigator aplikacji */}
                <AppNavigator />
              </NavigationContainer>
            </OptimizedBookProvider>
          </AuthProvider>
        </AuthErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

/**
 * App - Główny komponent aplikacji
 * Inicjalizuje podstawowe providery i error boundary
 */
const App = () => {
  return (
    {/* Główny error boundary dla całej aplikacji */}
    <AuthErrorBoundary>
      {/* Provider motywów - musi być na najwyższym poziomie */}
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthErrorBoundary>
  );
};

export default App;