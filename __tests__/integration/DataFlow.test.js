import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BookProvider, BookContext, BOOK_STATUS } from '../../src/context/BookContext';
import { AuthContext } from '../../src/context/AuthContext';
import { ThemeProvider } from '../../src/context/ThemeContext';
import BookListScreen from '../../src/screens/BookListScreen';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(JSON.stringify([]))),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      refreshSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 1, title: 'Test Book', author: 'Test Author' }, 
            error: null 
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../src/utils/responsive', () => ({
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  responsiveFontSize: (size) => size,
  getResponsivePadding: () => 16,
  isTablet: () => false,
  getGridColumns: () => 2,
}));

jest.mock('../../src/constants', () => ({
  STORAGE_KEYS: { BOOKS: 'books' },
  ERROR_MESSAGES: { GENERIC: 'An error occurred' },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    Searchbar: ({ onChangeText, value, placeholder, style }) => (
      <TextInput
        testID="searchbar"
        style={style}
        onChangeText={onChangeText}
        value={value}
        placeholder={placeholder}
      />
    ),
    FAB: ({ onPress, icon, style }) => (
      <TouchableOpacity testID="fab" style={style} onPress={onPress}>
        <Text>{icon}</Text>
      </TouchableOpacity>
    ),
    Chip: ({ children, onPress, selected, style }) => (
      <TouchableOpacity
        testID={`chip-${children}`}
        style={style}
        onPress={onPress}
        data-selected={selected}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Menu: ({ children, visible, anchor }) => (
      <View testID="menu">
        {anchor}
        {visible && children}
      </View>
    ),
    Text: ({ children, style, ...props }) => <Text style={style} {...props}>{children}</Text>,
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

// Mock BookItem
jest.mock('../../src/components/BookItem', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return ({ book, onPress }) => (
    <TouchableOpacity testID={`book-item-${book.id}`} onPress={onPress}>
      <View>
        <Text testID={`book-title-${book.id}`}>{book.title}</Text>
        <Text testID={`book-author-${book.id}`}>{book.author}</Text>
        <Text testID={`book-status-${book.id}`}>{book.status}</Text>
        <Text testID={`book-rating-${book.id}`}>{book.rating}</Text>
      </View>
    </TouchableOpacity>
  );
});

describe('Data Flow Integration Tests', () => {
  const mockBooks = [
    {
      id: '1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      status: BOOK_STATUS.READ,
      rating: 5,
      dateAdded: '2023-01-01T00:00:00.000Z',
      description: 'A classic American novel',
      notes: 'Excellent read',
    },
    {
      id: '2',
      title: '1984',
      author: 'George Orwell',
      status: BOOK_STATUS.READING,
      rating: 4,
      dateAdded: '2023-01-02T00:00:00.000Z',
      description: 'Dystopian fiction',
      notes: 'Thought-provoking',
    },
    {
      id: '3',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      status: BOOK_STATUS.WANT_TO_READ,
      rating: 0,
      dateAdded: '2023-01-03T00:00:00.000Z',
      description: 'American classic',
      notes: '',
    },
  ];

  const TestWrapper = ({ children, authUser = null, initialBooks = [] }) => {
    const authValue = {
      user: authUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };

    return (
      <ThemeProvider>
        <AuthContext.Provider value={authValue}>
          <BookProvider>
            {children}
          </BookProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Book Context Integration', () => {
    it('should load books from storage on mount', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(getByTestId('book-item-2')).toBeTruthy();
        expect(getByTestId('book-item-3')).toBeTruthy();
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('books');
    });

    it('should handle empty storage gracefully', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(null);

      const { getByText } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText(/Nie masz jeszcze zadnych ksiazek/)).toBeTruthy();
      });
    });

    it('should handle storage errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const { getByText } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText(/Nie masz jeszcze zadnych ksiazek/)).toBeTruthy();
      });
    });
  });

  describe('Search and Filter Integration', () => {
    it('should filter books by search query and status', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
      });

      // Apply search filter
      fireEvent.changeText(getByTestId('searchbar'), 'Gatsby');

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(queryByTestId('book-item-2')).toBeNull();
        expect(queryByTestId('book-item-3')).toBeNull();
      });

      // Clear search
      fireEvent.changeText(getByTestId('searchbar'), '');

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(getByTestId('book-item-2')).toBeTruthy();
        expect(getByTestId('book-item-3')).toBeTruthy();
      });

      // Apply status filter
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(queryByTestId('book-item-2')).toBeNull();
        expect(queryByTestId('book-item-3')).toBeNull();
      });
    });

    it('should combine search and status filters', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
      });

      // Apply status filter first
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      
      // Then apply search
      fireEvent.changeText(getByTestId('searchbar'), 'Gatsby');

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(queryByTestId('book-item-2')).toBeNull();
        expect(queryByTestId('book-item-3')).toBeNull();
      });

      // Search for non-matching book with same status
      fireEvent.changeText(getByTestId('searchbar'), '1984');

      await waitFor(() => {
        expect(queryByTestId('book-item-1')).toBeNull();
        expect(queryByTestId('book-item-2')).toBeNull();
        expect(queryByTestId('book-item-3')).toBeNull();
      });
    });
  });

  describe('Sorting Integration', () => {
    it('should sort books by different criteria', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId, getAllByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
      });

      // Test title sorting
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Tytul'));

      await waitFor(() => {
        const bookItems = getAllByTestId(/book-title-/);
        expect(bookItems.length).toBeGreaterThan(0);
      });

      // Test author sorting
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Autor'));

      await waitFor(() => {
        const bookItems = getAllByTestId(/book-author-/);
        expect(bookItems.length).toBeGreaterThan(0);
      });

      // Test rating sorting
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Ocena'));

      await waitFor(() => {
        const bookItems = getAllByTestId(/book-rating-/);
        expect(bookItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Authentication Integration with Book Data', () => {
    it('should load books from Supabase when user is logged in', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const supabase = require('../../src/config/supabase').supabase;
      
      supabase.from().select().eq().order.mockResolvedValue({
        data: mockBooks.map(book => ({
          ...book,
          cover_image: book.coverImage,
          date_added: book.dateAdded,
        })),
        error: null,
      });

      const { getByTestId } = render(
        <TestWrapper authUser={mockUser}>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(getByTestId('book-item-2')).toBeTruthy();
        expect(getByTestId('book-item-3')).toBeTruthy();
      });
    });

    it('should handle Supabase errors and fallback to local storage', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const supabase = require('../../src/config/supabase').supabase;
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      // Make Supabase fail
      supabase.from().select().eq().order.mockRejectedValue(new Error('Network error'));
      
      // Provide fallback data
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId } = render(
        <TestWrapper authUser={mockUser}>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
        expect(getByTestId('book-item-2')).toBeTruthy();
        expect(getByTestId('book-item-3')).toBeTruthy();
      });

      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('Theme Integration with Data', () => {
    it('should apply theme to book items consistently', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        const bookItems = [
          getByTestId('book-item-1'),
          getByTestId('book-item-2'),
          getByTestId('book-item-3'),
        ];

        bookItems.forEach(item => {
          expect(item).toBeTruthy();
        });
      });
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should handle large book collections efficiently', async () => {
      const largeBookSet = Array.from({ length: 100 }, (_, i) => ({
        id: `book-${i}`,
        title: `Book ${i}`,
        author: `Author ${i}`,
        status: BOOK_STATUS.READ,
        rating: (i % 5) + 1,
        dateAdded: new Date(2023, 0, i + 1).toISOString(),
      }));

      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(largeBookSet));

      const startTime = Date.now();

      const { getByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-book-1')).toBeTruthy();
        expect(Date.now() - startTime).toBeLessThan(5000); // Should load within 5 seconds
      });
    });

    it('should handle rapid filter changes without performance issues', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockBooks));

      const { getByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('book-item-1')).toBeTruthy();
      });

      // Rapid filter changes
      const searchbar = getByTestId('searchbar');
      const readChip = getByTestId(`chip-${BOOK_STATUS.READ}`);

      fireEvent.changeText(searchbar, 'G');
      fireEvent.changeText(searchbar, 'Ga');
      fireEvent.changeText(searchbar, 'Gat');
      fireEvent.changeText(searchbar, 'Gats');
      fireEvent.changeText(searchbar, 'Gatsby');
      
      fireEvent.press(readChip);
      fireEvent.press(readChip);
      fireEvent.press(readChip);

      fireEvent.changeText(searchbar, '');

      // Should handle rapid changes without errors
      expect(getByTestId('searchbar')).toBeTruthy();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from context errors gracefully', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Should not crash the app
      const { getByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('searchbar')).toBeTruthy();
        expect(getByTestId('fab')).toBeTruthy();
      });
    });

    it('should handle corrupted book data', async () => {
      const corruptedBooks = [
        { id: '1', title: null, author: undefined }, // Missing required fields
        { id: '2' }, // Minimal data
        null, // Null entry
        { id: '3', title: 'Valid Book', author: 'Valid Author', status: BOOK_STATUS.READ },
      ];

      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(corruptedBooks));

      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <BookListScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should only render valid books
        expect(queryByTestId('book-item-1')).toBeNull();
        expect(queryByTestId('book-item-2')).toBeNull();
        expect(getByTestId('book-item-3')).toBeTruthy();
      });
    });
  });
});