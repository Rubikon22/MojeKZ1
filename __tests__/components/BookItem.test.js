import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BookItem from '../../src/components/BookItem';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage for ThemeContext
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Card: ({ children, style, ...props }) => (
      <View style={style} testID="card" {...props}>
        {children}
      </View>
    ),
    Title: ({ children, style, ...props }) => (
      <Text style={style} testID="title" {...props}>
        {children}
      </Text>
    ),
    Paragraph: ({ children, style, ...props }) => (
      <Text style={style} testID="paragraph" {...props}>
        {children}
      </Text>
    ),
  };
});

// Mock StarRating component
jest.mock('../../src/components/StarRating', () => {
  const { View } = require('react-native');
  return ({ rating, readonly, size }) => (
    <View 
      testID="star-rating" 
      accessibilityLabel={`Rating: ${rating} stars`}
      data-rating={rating}
      data-readonly={readonly}
      data-size={size}
    />
  );
});

// Mock responsive utilities
jest.mock('../../src/utils/responsive', () => ({
  getBookCoverSize: () => ({ width: 70, height: 100 }),
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  responsiveFontSize: (size) => size,
  getResponsivePadding: () => 16,
}));

// Helper component to test BookItem within theme context
const BookItemWithTheme = (props) => (
  <ThemeProvider>
    <BookItem {...props} />
  </ThemeProvider>
);

describe('BookItem Component', () => {
  const mockBook = {
    id: '1',
    title: 'Test Book Title',
    author: 'Test Author',
    status: 'Przeczytana',
    rating: 4,
    description: 'Test description',
    notes: 'Test notes',
    coverImage: 'https://example.com/cover.jpg',
    dateAdded: '2023-01-01T00:00:00.000Z',
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render book information correctly', () => {
      const { getByTestId, getByText } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      expect(getByText('Test Book Title')).toBeTruthy();
      expect(getByText('Test Author')).toBeTruthy();
      expect(getByText('Przeczytana')).toBeTruthy();
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should render star rating with correct props', () => {
      const { getByTestId } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBe(4);
      expect(starRating.props['data-readonly']).toBe(true);
      expect(starRating.props['data-size']).toBe(16);
    });

    it('should render cover image when provided', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const coverImage = UNSAFE_getByType('Image');
      expect(coverImage).toBeTruthy();
      expect(coverImage.props.source.uri).toBe('https://example.com/cover.jpg');
    });

    it('should render placeholder when no cover image', () => {
      const bookWithoutCover = { ...mockBook, coverImage: null };
      const { getByText } = render(
        <BookItemWithTheme book={bookWithoutCover} onPress={mockOnPress} />
      );

      expect(getByText('Brak okladki')).toBeTruthy();
    });

    it('should truncate long titles', () => {
      const bookWithLongTitle = {
        ...mockBook,
        title: 'This is a very long book title that should be truncated when displayed',
      };
      
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithLongTitle} onPress={mockOnPress} />
      );

      const titleElement = getByTestId('title');
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('should truncate long author names', () => {
      const bookWithLongAuthor = {
        ...mockBook,
        author: 'This is a very long author name that should be truncated',
      };
      
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithLongAuthor} onPress={mockOnPress} />
      );

      const authorElements = getByTestId('paragraph');
      expect(authorElements.props.numberOfLines).toBe(1);
    });

    it('should render zero rating correctly', () => {
      const bookWithZeroRating = { ...mockBook, rating: 0 };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithZeroRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBe(0);
    });

    it('should render maximum rating correctly', () => {
      const bookWithMaxRating = { ...mockBook, rating: 5 };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithMaxRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBe(5);
    });
  });

  describe('interaction', () => {
    it('should call onPress when item is pressed', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(touchableOpacity);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPress with correct parameters', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(touchableOpacity);

      // Should be called without parameters (navigation handled by parent)
      expect(mockOnPress).toHaveBeenCalledWith();
    });

    it('should handle multiple rapid presses', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      
      fireEvent.press(touchableOpacity);
      fireEvent.press(touchableOpacity);
      fireEvent.press(touchableOpacity);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('different book statuses', () => {
    const statuses = ['Przeczytana', 'Czytam', 'Chce przeczytac'];

    statuses.forEach(status => {
      it(`should render ${status} status correctly`, () => {
        const bookWithStatus = { ...mockBook, status };
        const { getByText } = render(
          <BookItemWithTheme book={bookWithStatus} onPress={mockOnPress} />
        );

        expect(getByText(status)).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle book without title gracefully', () => {
      const bookWithoutTitle = { ...mockBook, title: '' };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithoutTitle} onPress={mockOnPress} />
      );

      const titleElement = getByTestId('title');
      expect(titleElement.props.children).toBe('');
    });

    it('should handle book without author gracefully', () => {
      const bookWithoutAuthor = { ...mockBook, author: '' };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithoutAuthor} onPress={mockOnPress} />
      );

      const authorElement = getByTestId('paragraph');
      expect(authorElement.props.children).toBe('');
    });

    it('should handle book without status gracefully', () => {
      const bookWithoutStatus = { ...mockBook, status: '' };
      const { getByText } = render(
        <BookItemWithTheme book={bookWithoutStatus} onPress={mockOnPress} />
      );

      expect(getByText('')).toBeTruthy();
    });

    it('should handle undefined rating', () => {
      const bookWithUndefinedRating = { ...mockBook, rating: undefined };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithUndefinedRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBeUndefined();
    });

    it('should handle null rating', () => {
      const bookWithNullRating = { ...mockBook, rating: null };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithNullRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBeNull();
    });

    it('should handle negative rating', () => {
      const bookWithNegativeRating = { ...mockBook, rating: -1 };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithNegativeRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBe(-1);
    });

    it('should handle rating above maximum', () => {
      const bookWithHighRating = { ...mockBook, rating: 10 };
      const { getByTestId } = render(
        <BookItemWithTheme book={bookWithHighRating} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props['data-rating']).toBe(10);
    });
  });

  describe('accessibility', () => {
    it('should be accessible via TouchableOpacity', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const touchableOpacity = UNSAFE_getByType('TouchableOpacity');
      expect(touchableOpacity).toBeTruthy();
      expect(touchableOpacity.type).toBe('TouchableOpacity');
    });

    it('should have accessible star rating', () => {
      const { getByTestId } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const starRating = getByTestId('star-rating');
      expect(starRating.props.accessibilityLabel).toBe('Rating: 4 stars');
    });
  });

  describe('prop validation', () => {
    it('should render without errors when all required props are provided', () => {
      expect(() => 
        render(<BookItemWithTheme book={mockBook} onPress={mockOnPress} />)
      ).not.toThrow();
    });

    it('should handle missing onPress prop gracefully', () => {
      expect(() => 
        render(<BookItemWithTheme book={mockBook} />)
      ).not.toThrow();
    });
  });

  describe('layout and styling', () => {
    it('should apply responsive styling', () => {
      const { getByTestId } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const card = getByTestId('card');
      expect(card.props.style).toBeDefined();
    });

    it('should maintain consistent layout structure', () => {
      const { getByTestId, UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      // Check that main structural elements exist
      expect(getByTestId('card')).toBeTruthy();
      expect(UNSAFE_getByType('TouchableOpacity')).toBeTruthy();
      expect(getByTestId('star-rating')).toBeTruthy();
    });
  });

  describe('image handling', () => {
    it('should handle invalid image URLs gracefully', () => {
      const bookWithInvalidImage = { 
        ...mockBook, 
        coverImage: 'invalid-url' 
      };
      
      expect(() => 
        render(<BookItemWithTheme book={bookWithInvalidImage} onPress={mockOnPress} />)
      ).not.toThrow();
    });

    it('should handle empty string image URL', () => {
      const bookWithEmptyImage = { 
        ...mockBook, 
        coverImage: '' 
      };
      
      const { getByText } = render(
        <BookItemWithTheme book={bookWithEmptyImage} onPress={mockOnPress} />
      );

      expect(getByText('Brak okladki')).toBeTruthy();
    });

    it('should set correct image props', () => {
      const { UNSAFE_getByType } = render(
        <BookItemWithTheme book={mockBook} onPress={mockOnPress} />
      );

      const coverImage = UNSAFE_getByType('Image');
      expect(coverImage.props.resizeMode).toBe('cover');
      expect(coverImage.props.source.uri).toBe(mockBook.coverImage);
    });
  });
});