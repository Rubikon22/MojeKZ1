# 📚 MojeKZ - Aplikacja do Zarządzania Księgozbiorem

## 📖 Opis Projektu

**MojeKZ** to nowoczesna aplikacja mobilna do zarządzania osobistym księgozbiorem, stworzona w React Native z wykorzystaniem Expo. Aplikacja umożliwia użytkownikom dodawanie, organizowanie i śledzenie statusu przeczytanych książek z pełnym wsparciem dla trybu offline.

### ✨ Główne Funkcjonalności

- 📱 **Responsywny Design** - Obsługa tabletów i telefonów
- 🔐 **Autoryzacja** - Bezpieczny system logowania i rejestracji
- 📚 **Zarządzanie Książkami** - Dodawanie, edycja, usuwanie książek
- ⭐ **System Ocen** - Ocenianie książek gwiazdkami (1-5)
- 📊 **Statusy Książek** - "Przeczytana", "Czytam", "Chcę przeczytać"
- 🔍 **Wyszukiwanie** - Szybkie znajdowanie książek po tytule lub autorze
- 🌙 **Motywy** - Jasny i ciemny motyw
- 📶 **Tryb Offline** - Pełna funkcjonalność bez połączenia internetowego
- 🔄 **Automatyczna Synchronizacja** - Synchronizacja danych po przywróceniu połączenia
- 📱 **Natywne Komponenty** - Material Design z React Native Paper

### 🏗️ Architektura

#### **Frontend Stack**
- **React Native** - Framework do tworzenia aplikacji mobilnych
- **Expo** - Platforma do rozwoju i dystrybucji aplikacji
- **React Navigation** - System nawigacji między ekranami
- **React Native Paper** - Komponenty Material Design
- **React Context API** - Zarządzanie stanem globalnym

#### **Backend & Database**
- **Supabase** - Backend-as-a-Service (PostgreSQL + API)
- **AsyncStorage** - Lokalne przechowywanie danych
- **Real-time Subscriptions** - Automatyczne aktualizacje danych

#### **Offline-First Architecture**
- **OfflineManager** - Zaawansowany system trybu offline
- **Operation Queue** - Kolejkowanie operacji do synchronizacji
- **Conflict Resolution** - Rozwiązywanie konfliktów danych
- **Network Detection** - Automatyczne wykrywanie statusu sieci

## 🚀 Instalacja i Uruchomienie

### Wymagania Systemowe

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0 lub **yarn** >= 1.22.0
- **Expo CLI** >= 6.0.0
- **Android Studio** (dla Androida) lub **Xcode** (dla iOS)

### 1. Klonowanie Repozytorium

```bash
git clone https://github.com/your-username/MojeKZ.git
cd MojeKZ
```

### 2. Instalacja Zależności

```bash
# Używając npm
npm install

# Lub używając yarn
yarn install
```

### 3. Konfiguracja Supabase

1. Utwórz konto na [Supabase](https://supabase.com)
2. Stwórz nowy projekt
3. Skopiuj `src/config/supabase.js.example` do `src/config/supabase.js`
4. Uzupełnij dane konfiguracyjne:

```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Struktura Bazy Danych

Wykonaj poniższe SQL queries w Supabase SQL Editor:

```sql
-- Tabela książek
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  status TEXT CHECK (status IN ('Przeczytana', 'Czytam', 'Chce przeczytac')) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polityki RLS (Row Level Security)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Polityka - użytkownicy mogą widzieć tylko swoje książki
CREATE POLICY "Users can view own books" ON books
  FOR SELECT USING (auth.uid() = user_id);

-- Polityka - użytkownicy mogą dodawać własne książki
CREATE POLICY "Users can insert own books" ON books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Polityka - użytkownicy mogą aktualizować swoje książki
CREATE POLICY "Users can update own books" ON books
  FOR UPDATE USING (auth.uid() = user_id);

-- Polityka - użytkownicy mogą usuwać swoje książki
CREATE POLICY "Users can delete own books" ON books
  FOR DELETE USING (auth.uid() = user_id);
```

### 5. Uruchomienie Aplikacji

```bash
# Uruchomienie developmentu
npm start
# lub
expo start

# Uruchomienie na Androidzie
npm run android
# lub
expo start --android

# Uruchomienie na iOS
npm run ios
# lub
expo start --ios

# Uruchomienie w przeglądarce (ograniczona funkcjonalność)
npm run web
# lub
expo start --web
```

## 🧪 Testowanie

### Uruchomienie Testów

```bash
# Uruchomienie wszystkich testów
npm test

# Uruchomienie testów z obserwowaniem zmian
npm run test:watch

# Generowanie raportu pokrycia kodu
npm run test:coverage

# Uruchomienie testów w trybie CI
npm run test:ci

# Aktualizacja snapshotów
npm run test:update
```

### Struktura Testów

```
__tests__/
├── components/           # Testy komponentów UI
├── context/             # Testy kontekstów React
├── integration/         # Testy integracyjne
├── navigation/          # Testy nawigacji
├── screens/            # Testy ekranów
├── utils/              # Testy funkcji pomocniczych
└── setup.js            # Konfiguracja testów
```

## 📁 Struktura Projektu

```
MojeKZ/
├── src/
│   ├── components/          # Komponenty UI wielokrotnego użytku
│   │   ├── AuthErrorBoundary.js
│   │   ├── BookItem.js      # Komponent pojedynczej książki
│   │   ├── ErrorFallback.js
│   │   ├── ErrorNotification.js
│   │   ├── OfflineIndicator.js  # Wskaźnik statusu offline
│   │   └── StarRating.js    # Komponent ocen gwiazdkami
│   ├── config/              # Konfiguracja aplikacji
│   │   └── supabase.js      # Konfiguracja Supabase
│   ├── constants/           # Stałe aplikacji
│   │   └── index.js
│   ├── context/             # Konteksty React (zarządzanie stanem)
│   │   ├── AuthContext.js   # Kontekst autoryzacji
│   │   ├── OptimizedBookContext.js  # Główny kontekst książek
│   │   └── ThemeContext.js  # Kontekst motywów
│   ├── hooks/               # Własne hooki React
│   │   └── useOrientation.js
│   ├── navigation/          # Konfiguracja nawigacji
│   │   └── AppNavigator.js
│   ├── screens/             # Ekrany aplikacji
│   │   ├── BookDetailScreen.js   # Szczegóły książki
│   │   ├── BookFormScreen.js     # Formularz dodawania/edycji
│   │   ├── BookListScreen.js     # Lista książek
│   │   ├── LoginScreen.js        # Ekran logowania
│   │   ├── RegisterScreen.js     # Ekran rejestracji
│   │   └── SettingsScreen.js     # Ustawienia aplikacji
│   └── utils/               # Funkcje pomocnicze
│       ├── deviceInfo.js    # Informacje o urządzeniu
│       ├── errorHandler.js  # Obsługa błędów
│       ├── networkStatus.js # Status połączenia sieciowego
│       ├── offlineManager.js # System trybu offline
│       ├── responsive.js    # Responsive design utilities
│       ├── storage.js       # Zarządzanie lokalnym storage
│       └── validation.js    # Walidacja formularzy
├── __tests__/               # Testy aplikacji
├── assets/                  # Zasoby statyczne
├── App.js                   # Główny komponent aplikacji
├── app.json                 # Konfiguracja Expo
├── babel.config.js          # Konfiguracja Babel
├── metro.config.js          # Konfiguracja Metro bundler
└── package.json             # Zależności i skrypty npm
```

## 🔧 Technologie i Zależności

### Główne Zależności

| Technologia | Wersja | Opis |
|-------------|--------|------|
| **React Native** | 0.72.10 | Framework aplikacji mobilnych |
| **Expo** | ~49.0.8 | Platforma rozwoju React Native |
| **React Navigation** | ^6.1.7 | System nawigacji |
| **React Native Paper** | ^5.10.3 | Komponenty Material Design |
| **Supabase** | ^2.50.0 | Backend-as-a-Service |
| **AsyncStorage** | 1.18.2 | Lokalne przechowywanie danych |
| **NetInfo** | 9.3.10 | Wykrywanie statusu sieci |
| **Formik** | ^2.4.3 | Zarządzanie formularzami |
| **Yup** | ^1.2.0 | Walidacja schematów |

### Narzędzia Deweloperskie

| Narzędzie | Wersja | Opis |
|-----------|--------|------|
| **Jest** | ^29.6.4 | Framework testowy |
| **Testing Library** | ^11.5.0 | Utilities do testowania React Native |
| **Babel** | ^7.20.0 | Transpiler JavaScript |
| **Metro** | - | Bundler React Native |

## 🔑 Główne Funkcjonalności Techniczne

### 1. **Offline-First Architecture**

```javascript
// Automatyczne wykrywanie sieci i synchronizacja
const OfflineManager = {
  // Kolejkowanie operacji w trybie offline
  queueOperation: async (operation) => { /* ... */ },
  
  // Automatyczna synchronizacja po powrocie online
  syncPendingOperations: async () => { /* ... */ },
  
  // Rozwiązywanie konfliktów danych
  resolveConflict: async (operation, conflict) => { /* ... */ }
};
```

### 2. **Optimized Context Pattern**

```javascript
// Rozdzielone konteksty dla lepszej wydajności
const BookStateContext = createContext();    // Stan (read-only)
const BookActionsContext = createContext();  // Akcje (functions)

// Komponenty subskrybują tylko potrzebne części stanu
const { books, loading } = useBookState();
const { addBook, updateBook } = useBookActions();
```

### 3. **Responsive Design System**

```javascript
// Automatyczne dostosowanie do różnych rozmiarów ekranów
const responsive = {
  getGridColumns: () => isTablet() ? 3 : 2,
  getResponsivePadding: () => isTablet() ? 24 : 16,
  responsiveFontSize: (size) => size * getScreenScale()
};
```

### 4. **Error Handling & Recovery**

```javascript
// Wielopoziomowa obsługa błędów
<AuthErrorBoundary>          // Poziom aplikacji
  <ScreenErrorBoundary>      // Poziom ekranu
    <ComponentErrorBoundary> // Poziom komponentu
```

## 📱 Użytkowanie

### 1. **Rejestracja i Logowanie**
- Utwórz konto podając email i hasło
- Zaloguj się używając swoich danych
- Obsługa błędów autoryzacji z ponownymi próbami

### 2. **Zarządzanie Książkami**
- **Dodawanie**: Kliknij przycisk "+" i wypełnij formularz
- **Edycja**: Kliknij na książkę, następnie "Edytuj"
- **Usuwanie**: Przytrzymaj książkę i wybierz "Usuń"
- **Statusy**: Zmień status na "Czytam", "Przeczytana" lub "Chcę przeczytać"

### 3. **Wyszukiwanie i Filtrowanie**
- Użyj paska wyszukiwania do znajdowania książek
- Filtruj książki według statusu
- Sortuj według daty dodania, tytułu lub autora

### 4. **Tryb Offline**
- Aplikacja automatycznie przechodzi w tryb offline bez sieci
- Wszystkie operacje są zapisywane lokalnie
- Automatyczna synchronizacja po przywróceniu połączenia
- Wskaźnik statusu offline/online w górnej części ekranu

## 🛠️ Rozwój i Kontrybuowanie

### Przygotowanie Środowiska Developerskiego

1. Sklonuj repozytorium
2. Zainstaluj zależności: `npm install`
3. Uruchom testy: `npm test`
4. Uruchom aplikację: `npm start`

### Standardy Kodowania

- **ESLint** - Linting JavaScript/React
- **Prettier** - Formatowanie kodu
- **JSDoc** - Dokumentacja funkcji
- **PropTypes** - Walidacja props komponentów
- **Test Coverage** - Minimum 70% pokrycia testami

### Workflow Rozwoju

1. Utwórz branch dla nowej funkcjonalności
2. Napisz testy dla nowej funkcjonalności
3. Zaimplementuj funkcjonalność
4. Uruchom wszystkie testy
5. Utwórz Pull Request

## 📋 To-Do / Roadmap

- [ ] **Push Notifications** - Powiadomienia o nowych książkach
- [ ] **Social Features** - Udostępnianie list książek
- [ ] **Book Recommendations** - System rekomendacji
- [ ] **Reading Progress** - Śledzenie postępu czytania
- [ ] **Export/Import** - Eksport danych do CSV/JSON
- [ ] **Dark Mode Improvements** - Lepsze motywy
- [ ] **Accessibility** - Wsparcie dla screen readers
- [ ] **Performance Optimization** - Virtualizacja list

## 🤝 Wsparcie

### Zgłaszanie Błędów

Jeśli znajdziesz błąd, prosimy o utworzenie Issue na GitHubie z następującymi informacjami:

- Opis błędu
- Kroki do reprodukcji
- Oczekiwane zachowanie
- Logi błędów (jeśli dostępne)
- Informacje o urządzeniu i systemie

### Kontakt

- **Email**: support@mojekz.app
- **GitHub Issues**: [https://github.com/your-username/MojeKZ/issues](https://github.com/your-username/MojeKZ/issues)

## 📄 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 🙏 Podziękowania

- **React Native Team** - Za framework
- **Expo Team** - Za platformę rozwoju
- **Supabase** - Za backend-as-a-service
- **Material Design** - Za system designu
- **Społeczność Open Source** - Za niezliczone biblioteki i narzędzia

---

**MojeKZ** - Twój cyfrowy księgozbiór zawsze pod ręką! 📚✨