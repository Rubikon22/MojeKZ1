// Application constants
export const APP_CONFIG = {
  VERSION: '1.0.0',
  MAX_RATING: 5,
  FAB_SPACING: 80,
  IMAGE_QUALITY: 0.7,
  ASPECT_RATIO: [2, 3],
};

// Book status constants
export const BOOK_STATUS = {
  READ: 'Przeczytana',
  reading: 'Czytam',
  wantToRead: 'Chce przeczytac',
};

// Device breakpoints
export const BREAKPOINTS = {
  SMALL: 360,
  MEDIUM: 600,
  LARGE: 768,
};

// Common colors (fallback values)
export const COLORS = {
  STAR_ACTIVE: '#FFC107',
  STAR_INACTIVE: '#E0E0E0',
  TRANSPARENT: 'transparent',
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Brak polaczenia z internetem',
  VALIDATION: 'Wypelnij wszystkie wymagane pola',
  DUPLICATE: 'Ta ksiazka juz istnieje',
  GENERIC: 'Wystapil nieoczekiwany blad',
  AUTH_FAILED: 'Niepoprawne dane logowania',
  PERMISSIONS: 'Brak wymaganych uprawnien',
};

// Success messages
export const SUCCESS_MESSAGES = {
  BOOK_ADDED: 'Ksiazka zostala dodana!',
  BOOK_UPDATED: 'Ksiazka zostala zaktualizowana!',
  BOOK_DELETED: 'Ksiazka zostala usunieta!',
  LOGIN_SUCCESS: 'Pomyslnie zalogowano!',
  REGISTER_SUCCESS: 'Konto zostalo utworzone!',
};

// Form validation constants
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_TITLE_LENGTH: 100,
  MAX_AUTHOR_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 500,
};

// Animation durations
export const ANIMATION = {
  SNACKBAR_DURATION: 4000,
  FADE_DURATION: 300,
  SLIDE_DURATION: 250,
};

// Storage keys
export const STORAGE_KEYS = {
  BOOKS: 'books',
  THEME: 'darkMode',
  USER_PREFERENCES: 'userPreferences',
};