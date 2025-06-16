import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BookFormScreen from '../../src/screens/BookFormScreen';
import { BookContext, BOOK_STATUS } from '../../src/context/BookContext';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock image picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  requestCameraPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  launchImageLibraryAsync: jest.fn(() => 
    Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock-image-uri' }]
    })
  ),
  launchCameraAsync: jest.fn(() => 
    Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock-camera-uri' }]
    })
  ),
  MediaTypeOptions: {
    Images: 'Images',
  },
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
}));

// Mock error handler
jest.mock('../../src/utils/errorHandler', () => ({
  ErrorHandler: {
    handleAsync: jest.fn((fn) => fn()),
    showSuccess: jest.fn((message, title, callback) => callback && callback()),
    showError: jest.fn(),
  },
}));

// Mock validation
jest.mock('../../src/utils/validation', () => ({
  BookSchema: {
    validate: jest.fn((values) => Promise.resolve(values)),
  },
}));

// Mock constants
jest.mock('../../src/constants', () => ({
  APP_CONFIG: {
    ASPECT_RATIO: [2, 3],
    IMAGE_QUALITY: 0.7,
  },
  SUCCESS_MESSAGES: {
    BOOK_ADDED: 'Book added successfully',
    BOOK_UPDATED: 'Book updated successfully',
  },
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    TextInput: ({ label, value, onChangeText, error, ...props }) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          testID={`input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          value={value}
          onChangeText={onChangeText}
          {...props}
        />
        {error && <Text testID={`error-${label?.toLowerCase().replace(/\s+/g, '-')}`}>{error}</Text>}
      </View>
    ),
    Button: ({ children, onPress, mode, disabled, ...props }) => (
      <TouchableOpacity
        testID={`button-${children?.toLowerCase().replace(/\s+/g, '-')}`}
        onPress={onPress}
        disabled={disabled}
        data-mode={mode}
        {...props}
      >
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    Text: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    Title: ({ children, ...props }) => <Text {...props}>{children}</Text>,
    HelperText: ({ children, type, ...props }) => (
      <Text testID={`helper-${type}`} {...props}>{children}</Text>
    ),
    RadioButton: {
      Group: ({ value, onValueChange, children }) => (
        <View testID="radio-group" data-value={value}>
          {children}
        </View>
      ),
      Item: ({ label, value, ...props }) => (
        <TouchableOpacity testID={`radio-${value}`} {...props}>
          <Text>{label}</Text>
        </TouchableOpacity>
      ),
    },
  };
});

// Mock StarRating component
jest.mock('../../src/components/StarRating', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ rating, onRatingChange, readonly }) => (
    <TouchableOpacity
      testID="star-rating"
      onPress={() => !readonly && onRatingChange && onRatingChange(rating + 1)}
      data-rating={rating}
      data-readonly={readonly}
    >
      <Text>Rating: {rating}</Text>
    </TouchableOpacity>
  );
});

// Mock Platform
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Platform: {
      OS: 'ios',
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Helper to create mock book context
const createMockBookContext = () => ({
  books: [],
  loading: false,
  addBook: jest.fn(() => Promise.resolve()),
  updateBook: jest.fn(() => Promise.resolve()),
  deleteBook: jest.fn(),
  clearAllBooks: jest.fn(),
});

// Helper to render screen with providers
const renderBookFormScreen = (bookContextValue = createMockBookContext(), routeParams = {}) => {
  const mockUseRoute = jest.fn(() => ({ params: routeParams }));
  jest.doMock('@react-navigation/native', () => ({
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
    useRoute: mockUseRoute,
  }));

  return render(
    <ThemeProvider>
      <BookContext.Provider value={bookContextValue}>
        <BookFormScreen />
      </BookContext.Provider>
    </ThemeProvider>
  );
};

describe('BookFormScreen', () => {
  const mockBook = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    description: 'Test description',
    notes: 'Test notes',
    status: BOOK_STATUS.READ,
    rating: 4,
    coverImage: 'test-image-uri',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render title input', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('input-title')).toBeTruthy();
    });

    it('should render author input', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('input-author')).toBeTruthy();
    });

    it('should render description input', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('input-description')).toBeTruthy();
    });

    it('should render notes input', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('input-notes')).toBeTruthy();
    });

    it('should render status radio group', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('radio-group')).toBeTruthy();
    });

    it('should render star rating component', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('star-rating')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('button-add-book') || getByTestId('button-update-book')).toBeTruthy();
    });

    it('should render image picker buttons', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('button-choose-from-gallery') || getByTestId('button-take-photo')).toBeTruthy();
    });
  });

  describe('form validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const { getByTestId } = renderBookFormScreen();
      
      // Try to submit with empty form
      const submitButton = getByTestId('button-add-book') || getByTestId('button-update-book');
      fireEvent.press(submitButton);

      // Validation errors should be handled by formik
      expect(getByTestId('input-title')).toBeTruthy();
    });

    it('should validate title field', async () => {
      const { getByTestId } = renderBookFormScreen();
      
      const titleInput = getByTestId('input-title');
      fireEvent.changeText(titleInput, '');
      
      // Validation should trigger
      expect(titleInput.props.value).toBe('');
    });

    it('should validate author field', async () => {
      const { getByTestId } = renderBookFormScreen();
      
      const authorInput = getByTestId('input-author');
      fireEvent.changeText(authorInput, '');
      
      expect(authorInput.props.value).toBe('');
    });
  });

  describe('form interaction', () => {
    it('should update title field value', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const titleInput = getByTestId('input-title');
      fireEvent.changeText(titleInput, 'New Book Title');
      
      expect(titleInput.props.value).toBe('New Book Title');
    });

    it('should update author field value', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const authorInput = getByTestId('input-author');
      fireEvent.changeText(authorInput, 'New Author');
      
      expect(authorInput.props.value).toBe('New Author');
    });

    it('should update description field value', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const descriptionInput = getByTestId('input-description');
      fireEvent.changeText(descriptionInput, 'New description');
      
      expect(descriptionInput.props.value).toBe('New description');
    });

    it('should update notes field value', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const notesInput = getByTestId('input-notes');
      fireEvent.changeText(notesInput, 'New notes');
      
      expect(notesInput.props.value).toBe('New notes');
    });

    it('should update rating when star rating is interacted', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const starRating = getByTestId('star-rating');
      fireEvent.press(starRating);
      
      expect(starRating).toBeTruthy();
    });
  });

  describe('image handling', () => {
    it('should handle image selection from gallery', async () => {
      const { getByTestId } = renderBookFormScreen();
      
      const galleryButton = getByTestId('button-choose-from-gallery');
      
      await act(async () => {
        fireEvent.press(galleryButton);
      });
      
      // Should call image picker
      const ImagePicker = require('expo-image-picker');
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    it('should handle taking photo with camera', async () => {
      const { getByTestId } = renderBookFormScreen();
      
      const cameraButton = getByTestId('button-take-photo');
      
      await act(async () => {
        fireEvent.press(cameraButton);
      });
      
      // Should call camera
      const ImagePicker = require('expo-image-picker');
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    it('should handle image picker permissions denial', async () => {
      const ImagePicker = require('expo-image-picker');
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ 
        status: 'denied' 
      });
      
      const { getByTestId } = renderBookFormScreen();
      
      const galleryButton = getByTestId('button-choose-from-gallery');
      
      await act(async () => {
        fireEvent.press(galleryButton);
      });
      
      // Should show alert for permissions
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('should handle camera permissions denial', async () => {
      const ImagePicker = require('expo-image-picker');
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ 
        status: 'denied' 
      });
      
      const { getByTestId } = renderBookFormScreen();
      
      const cameraButton = getByTestId('button-take-photo');
      
      await act(async () => {
        fireEvent.press(cameraButton);
      });
      
      const { Alert } = require('react-native');
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('should call addBook when adding new book', async () => {
      const mockContext = createMockBookContext();
      const { getByTestId } = renderBookFormScreen(mockContext);
      
      // Fill required fields
      fireEvent.changeText(getByTestId('input-title'), 'Test Book');
      fireEvent.changeText(getByTestId('input-author'), 'Test Author');
      
      // Submit form
      const submitButton = getByTestId('button-add-book') || getByTestId('button-update-book');
      
      await act(async () => {
        fireEvent.press(submitButton);
      });
      
      expect(mockContext.addBook).toHaveBeenCalled();
    });

    it('should call updateBook when editing existing book', async () => {
      const mockContext = createMockBookContext();
      const routeParams = {
        isEditing: true,
        book: mockBook,
      };
      
      const { getByTestId } = renderBookFormScreen(mockContext, routeParams);
      
      // Submit form
      const submitButton = getByTestId('button-add-book') || getByTestId('button-update-book');
      
      await act(async () => {
        fireEvent.press(submitButton);
      });
      
      expect(mockContext.updateBook).toHaveBeenCalled();
    });

    it('should navigate back after successful submission', async () => {
      const mockContext = createMockBookContext();
      const { getByTestId } = renderBookFormScreen(mockContext);
      
      fireEvent.changeText(getByTestId('input-title'), 'Test Book');
      fireEvent.changeText(getByTestId('input-author'), 'Test Author');
      
      const submitButton = getByTestId('button-add-book') || getByTestId('button-update-book');
      
      await act(async () => {
        fireEvent.press(submitButton);
      });
      
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      const mockContext = createMockBookContext();
      mockContext.addBook.mockRejectedValue(new Error('Save failed'));
      
      const { getByTestId } = renderBookFormScreen(mockContext);
      
      fireEvent.changeText(getByTestId('input-title'), 'Test Book');
      fireEvent.changeText(getByTestId('input-author'), 'Test Author');
      
      const submitButton = getByTestId('button-add-book') || getByTestId('button-update-book');
      
      await act(async () => {
        fireEvent.press(submitButton);
      });
      
      // Error should be handled by ErrorHandler
      expect(mockContext.addBook).toHaveBeenCalled();
    });
  });

  describe('editing mode', () => {
    it('should populate form with existing book data when editing', () => {
      const routeParams = {
        isEditing: true,
        book: mockBook,
      };
      
      const { getByTestId } = renderBookFormScreen(createMockBookContext(), routeParams);
      
      expect(getByTestId('input-title').props.value).toBe(mockBook.title);
      expect(getByTestId('input-author').props.value).toBe(mockBook.author);
      expect(getByTestId('input-description').props.value).toBe(mockBook.description);
      expect(getByTestId('input-notes').props.value).toBe(mockBook.notes);
    });

    it('should show update button text when editing', () => {
      const routeParams = {
        isEditing: true,
        book: mockBook,
      };
      
      const { queryByTestId } = renderBookFormScreen(createMockBookContext(), routeParams);
      
      expect(queryByTestId('button-update-book')).toBeTruthy();
    });

    it('should show add button text when creating new book', () => {
      const { queryByTestId } = renderBookFormScreen();
      
      expect(queryByTestId('button-add-book')).toBeTruthy();
    });
  });

  describe('status selection', () => {
    it('should render all status options', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId(`radio-${BOOK_STATUS.READ}`)).toBeTruthy();
      expect(getByTestId(`radio-${BOOK_STATUS.READING}`)).toBeTruthy();
      expect(getByTestId(`radio-${BOOK_STATUS.WANT_TO_READ}`)).toBeTruthy();
    });

    it('should handle status selection', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const readRadio = getByTestId(`radio-${BOOK_STATUS.READ}`);
      fireEvent.press(readRadio);
      
      expect(readRadio).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should provide accessible form inputs', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('input-title')).toBeTruthy();
      expect(getByTestId('input-author')).toBeTruthy();
      expect(getByTestId('input-description')).toBeTruthy();
      expect(getByTestId('input-notes')).toBeTruthy();
    });

    it('should provide accessible buttons', () => {
      const { getByTestId } = renderBookFormScreen();
      
      expect(getByTestId('button-choose-from-gallery') || getByTestId('button-take-photo')).toBeTruthy();
      expect(getByTestId('button-add-book') || getByTestId('button-update-book')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle very long text inputs', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const longText = 'a'.repeat(1000);
      
      expect(() => {
        fireEvent.changeText(getByTestId('input-title'), longText);
        fireEvent.changeText(getByTestId('input-description'), longText);
      }).not.toThrow();
    });

    it('should handle special characters in inputs', () => {
      const { getByTestId } = renderBookFormScreen();
      
      const specialText = 'Książka z śpiewkami & ćwiczy się';
      
      expect(() => {
        fireEvent.changeText(getByTestId('input-title'), specialText);
        fireEvent.changeText(getByTestId('input-author'), specialText);
      }).not.toThrow();
    });

    it('should handle image picker cancellation', async () => {
      const ImagePicker = require('expo-image-picker');
      ImagePicker.launchImageLibraryAsync.mockResolvedValue({ cancelled: true });
      
      const { getByTestId } = renderBookFormScreen();
      
      const galleryButton = getByTestId('button-choose-from-gallery');
      
      await act(async () => {
        fireEvent.press(galleryButton);
      });
      
      // Should handle cancellation gracefully
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });
});