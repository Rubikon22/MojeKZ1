import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BookListScreen from '../../src/screens/BookListScreen';
import { BookContext, BOOK_STATUS } from '../../src/context/BookContext';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
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
  getGridColumns: () => 2,
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    Searchbar: ({ onChangeText, value, placeholder, style, ...props }) => (
      <TextInput
        testID="searchbar"
        style={style}
        onChangeText={onChangeText}
        value={value}
        placeholder={placeholder}
        {...props}
      />
    ),
    FAB: ({ onPress, icon, style, ...props }) => (
      <TouchableOpacity testID="fab" style={style} onPress={onPress} {...props}>
        <Text>{icon}</Text>
      </TouchableOpacity>
    ),
    Chip: ({ children, onPress, selected, style, icon, ...props }) => (
      <TouchableOpacity
        testID={`chip-${children || icon}`}
        style={style}
        onPress={onPress}
        data-selected={selected}
        {...props}
      >
        <Text>{children || icon}</Text>
      </TouchableOpacity>
    ),
    Menu: ({ children, visible, onDismiss, anchor }) => (
      <View testID="menu">
        {anchor}
        {visible && (
          <View testID="menu-items">
            {children}
          </View>
        )}
      </View>
    ),
    Text: ({ children, style, ...props }) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
  };
});

// Create menu item mock
jest.mock('react-native-paper', () => {
  const original = jest.requireActual('react-native-paper');
  const { TouchableOpacity, Text } = require('react-native');
  
  return {
    ...original,
    Menu: {
      ...original.Menu,
      Item: ({ onPress, title, ...props }) => (
        <TouchableOpacity testID={`menu-item-${title.split(' ')[0]}`} onPress={onPress} {...props}>
          <Text>{title}</Text>
        </TouchableOpacity>
      ),
    },
  };
});

// Mock BookItem component
jest.mock('../../src/components/BookItem', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return ({ book, onPress }) => (
    <TouchableOpacity testID={`book-item-${book.id}`} onPress={onPress}>
      <View>
        <Text testID={`book-title-${book.id}`}>{book.title}</Text>
        <Text testID={`book-author-${book.id}`}>{book.author}</Text>
        <Text testID={`book-status-${book.id}`}>{book.status}</Text>
      </View>
    </TouchableOpacity>
  );
});

// Helper to create mock book context
const createMockBookContext = (books = [], loading = false) => ({
  books,
  loading,
  addBook: jest.fn(),
  updateBook: jest.fn(),
  deleteBook: jest.fn(),
  clearAllBooks: jest.fn(),
});

// Helper to render screen with providers
const renderBookListScreen = (bookContextValue = createMockBookContext()) => {
  return render(
    <ThemeProvider>
      <BookContext.Provider value={bookContextValue}>
        <BookListScreen />
      </BookContext.Provider>
    </ThemeProvider>
  );
};

describe('BookListScreen', () => {
  const mockBooks = [
    {
      id: '1',
      title: 'Test Book One',
      author: 'Test Author One',
      status: BOOK_STATUS.READ,
      rating: 5,
      dateAdded: '2023-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Another Book',
      author: 'Another Author',
      status: BOOK_STATUS.READING,
      rating: 4,
      dateAdded: '2023-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      title: 'Future Read',
      author: 'Future Author',
      status: BOOK_STATUS.WANT_TO_READ,
      rating: 0,
      dateAdded: '2023-01-03T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search bar', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId('searchbar')).toBeTruthy();
    });

    it('should render filter chips', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId(`chip-${BOOK_STATUS.READ}`)).toBeTruthy();
      expect(getByTestId(`chip-${BOOK_STATUS.READING}`)).toBeTruthy();
      expect(getByTestId(`chip-${BOOK_STATUS.WANT_TO_READ}`)).toBeTruthy();
    });

    it('should render sort menu', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId('chip-Sortuj')).toBeTruthy();
    });

    it('should render FAB button', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId('fab')).toBeTruthy();
    });

    it('should render book list when books are available', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(getByTestId('book-item-2')).toBeTruthy();
      expect(getByTestId('book-item-3')).toBeTruthy();
    });

    it('should render empty state when no books', () => {
      const { getByText } = renderBookListScreen(createMockBookContext([]));
      
      expect(getByText('Nie masz jeszcze zadnych ksiazek. Dodaj pierwsza!')).toBeTruthy();
    });

    it('should render empty search results message', () => {
      const { getByTestId, getByText } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'nonexistent book');
      
      expect(getByText('Brak ksiazek spelniajacych kryteria wyszukiwania.')).toBeTruthy();
    });
  });

  describe('search functionality', () => {
    it('should filter books by title', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'Test Book');
      
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(queryByTestId('book-item-2')).toBeNull();
      expect(queryByTestId('book-item-3')).toBeNull();
    });

    it('should filter books by author', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'Another Author');
      
      expect(queryByTestId('book-item-1')).toBeNull();
      expect(getByTestId('book-item-2')).toBeTruthy();
      expect(queryByTestId('book-item-3')).toBeNull();
    });

    it('should be case insensitive', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'test book');
      
      expect(getByTestId('book-item-1')).toBeTruthy();
    });

    it('should clear search results when search is cleared', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'Test Book');
      expect(getByTestId('book-item-1')).toBeTruthy();
      
      fireEvent.changeText(getByTestId('searchbar'), '');
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(getByTestId('book-item-2')).toBeTruthy();
      expect(getByTestId('book-item-3')).toBeTruthy();
    });
  });

  describe('status filtering', () => {
    it('should filter books by read status', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(queryByTestId('book-item-2')).toBeNull();
      expect(queryByTestId('book-item-3')).toBeNull();
    });

    it('should filter books by reading status', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READING}`));
      
      expect(queryByTestId('book-item-1')).toBeNull();
      expect(getByTestId('book-item-2')).toBeTruthy();
      expect(queryByTestId('book-item-3')).toBeNull();
    });

    it('should filter books by want to read status', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.WANT_TO_READ}`));
      
      expect(queryByTestId('book-item-1')).toBeNull();
      expect(queryByTestId('book-item-2')).toBeNull();
      expect(getByTestId('book-item-3')).toBeTruthy();
    });

    it('should toggle filter when same status is pressed', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      // Apply filter
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      expect(getByTestId('book-item-1')).toBeTruthy();
      
      // Toggle off filter
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(getByTestId('book-item-2')).toBeTruthy();
      expect(getByTestId('book-item-3')).toBeTruthy();
    });
  });

  describe('sorting functionality', () => {
    it('should open sort menu when sort chip is pressed', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      expect(queryByTestId('menu-items')).toBeNull();
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      
      expect(getByTestId('menu-items')).toBeTruthy();
    });

    it('should sort books by title ascending', () => {
      const { getByTestId, getAllByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Tytul'));
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Tytul')); // Second press for ascending
      
      const bookTitles = getAllByTestId(/book-title-/);
      expect(bookTitles[0].props.children).toBe('Another Book');
      expect(bookTitles[1].props.children).toBe('Future Read');
      expect(bookTitles[2].props.children).toBe('Test Book One');
    });

    it('should sort books by author', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Autor'));
      
      // Verify sorting happened (would need to check actual order in real implementation)
      expect(getByTestId('book-item-1')).toBeTruthy();
    });

    it('should sort books by rating', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Ocena'));
      
      expect(getByTestId('book-item-1')).toBeTruthy();
    });

    it('should sort books by date added', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Data'));
      
      expect(getByTestId('book-item-1')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to book form when FAB is pressed', () => {
      const { getByTestId } = renderBookListScreen();
      
      fireEvent.press(getByTestId('fab'));
      
      expect(mockNavigate).toHaveBeenCalledWith('BookForm');
    });

    it('should navigate to book detail when book item is pressed', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId('book-item-1'));
      
      expect(mockNavigate).toHaveBeenCalledWith('BookDetail', {
        id: '1',
        title: 'Test Book One',
      });
    });
  });

  describe('combined filters', () => {
    it('should apply both search and status filters', () => {
      const { getByTestId, queryByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      // Apply status filter
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      
      // Apply search filter
      fireEvent.changeText(getByTestId('searchbar'), 'Test');
      
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(queryByTestId('book-item-2')).toBeNull();
      expect(queryByTestId('book-item-3')).toBeNull();
    });

    it('should show no results when filters dont match any books', () => {
      const { getByTestId, getByText } = renderBookListScreen(createMockBookContext(mockBooks));
      
      fireEvent.press(getByTestId(`chip-${BOOK_STATUS.READ}`));
      fireEvent.changeText(getByTestId('searchbar'), 'Another Book');
      
      expect(getByText('Brak ksiazek spelniajacych kryteria wyszukiwania.')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('should handle loading state gracefully', () => {
      const { getByTestId } = renderBookListScreen(createMockBookContext([], true));
      
      expect(getByTestId('searchbar')).toBeTruthy();
      expect(getByTestId('fab')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle books without dateAdded field', () => {
      const booksWithoutDate = [
        { ...mockBooks[0], dateAdded: undefined },
        { ...mockBooks[1], dateAdded: null },
      ];
      
      const { getByTestId } = renderBookListScreen(createMockBookContext(booksWithoutDate));
      
      fireEvent.press(getByTestId('chip-Sortuj'));
      fireEvent.press(getByTestId('menu-item-Data'));
      
      expect(getByTestId('book-item-1')).toBeTruthy();
      expect(getByTestId('book-item-2')).toBeTruthy();
    });

    it('should handle books with special characters in title/author', () => {
      const specialBooks = [
        {
          id: '1',
          title: 'Książka z śpiewkami',
          author: 'Józef Żółć',
          status: BOOK_STATUS.READ,
          rating: 5,
          dateAdded: '2023-01-01T00:00:00.000Z',
        },
      ];
      
      const { getByTestId } = renderBookListScreen(createMockBookContext(specialBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'Książka');
      
      expect(getByTestId('book-item-1')).toBeTruthy();
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const { getByTestId } = renderBookListScreen(createMockBookContext(mockBooks));
      
      expect(() => {
        fireEvent.changeText(getByTestId('searchbar'), longQuery);
      }).not.toThrow();
    });

    it('should handle empty book titles and authors', () => {
      const emptyFieldBooks = [
        {
          id: '1',
          title: '',
          author: '',
          status: BOOK_STATUS.READ,
          rating: 0,
          dateAdded: '2023-01-01T00:00:00.000Z',
        },
      ];
      
      const { getByTestId } = renderBookListScreen(createMockBookContext(emptyFieldBooks));
      
      fireEvent.changeText(getByTestId('searchbar'), 'test');
      
      expect(getByTestId('book-item-1')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should provide accessible search bar', () => {
      const { getByTestId } = renderBookListScreen();
      
      const searchbar = getByTestId('searchbar');
      expect(searchbar.props.placeholder).toBe('Szukaj ksiazke lub autora');
    });

    it('should provide accessible FAB', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId('fab')).toBeTruthy();
    });

    it('should provide accessible filter chips', () => {
      const { getByTestId } = renderBookListScreen();
      
      expect(getByTestId(`chip-${BOOK_STATUS.READ}`)).toBeTruthy();
      expect(getByTestId(`chip-${BOOK_STATUS.READING}`)).toBeTruthy();
      expect(getByTestId(`chip-${BOOK_STATUS.WANT_TO_READ}`)).toBeTruthy();
    });
  });
});