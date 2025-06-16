// Global test setup for React Native application

import { jest } from '@jest/globals';

// Mock react-native modules that aren't available in the test environment
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '14.0',
  select: jest.fn((obj) => obj.ios),
}));

// Mock StatusBar
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => ({
  currentHeight: 20,
  setBarStyle: jest.fn(),
  setBackgroundColor: jest.fn(),
  setHidden: jest.fn(),
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock Keyboard
jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  dismiss: jest.fn(),
}));

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock PermissionsAndroid
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve(true)),
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  PERMISSIONS: {
    CAMERA: 'android.permission.CAMERA',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    useSafeAreaInsets: () => inset,
    getStatusBarHeight: () => 20,
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setParams: jest.fn(),
      addListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
    }),
    useRoute: () => ({
      params: {},
      name: 'TestScreen',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));


// Mock file system for tests
global.Blob = class Blob {
  constructor(content) {
    this.size = content.reduce((size, chunk) => size + chunk.length, 0);
  }
};

// Mock fetch for network requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = {};
  }
  
  append(key, value) {
    this.data[key] = value;
  }
  
  get(key) {
    return this.data[key];
  }
};

// Mock URL
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.origin = 'https://example.com';
    this.pathname = '/';
  }
};

// Silence console warnings during tests unless debugging
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

beforeEach(() => {
  // Reset console mocks for each test
  if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  }
});

afterEach(() => {
  // Restore console for debugging if needed
  if (process.env.DEBUG_TESTS) {
    console.warn = originalWarn;
    console.error = originalError;
    console.log = originalLog;
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create mock navigation props
  createMockNavigation: (overrides = {}) => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
    ...overrides,
  }),

  // Helper to create mock route props
  createMockRoute: (params = {}, name = 'TestScreen') => ({
    params,
    name,
    key: 'test-key',
  }),

  // Helper to wait for async operations
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock book data
  createMockBook: (overrides = {}) => ({
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    status: 'Przeczytana',
    rating: 4,
    description: 'Test description',
    notes: 'Test notes',
    coverImage: 'https://example.com/cover.jpg',
    dateAdded: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock user data
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {},
    ...overrides,
  }),
};