import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  saveBooks,
  loadBooks,
  clearAllData,
  exportBooksToJson,
  importBooksFromJson,
  getStorageInfo,
} from '../../src/utils/storage';
import { STORAGE_KEYS } from '../../src/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('Storage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveBooks', () => {
    const mockBooks = [
      {
        id: '1',
        title: 'Test Book 1',
        author: 'Test Author 1',
        status: 'Przeczytana',
        rating: 5,
      },
      {
        id: '2',
        title: 'Test Book 2',
        author: 'Test Author 2',
        status: 'Czytam',
        rating: 4,
      },
    ];

    it('should save books successfully', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await saveBooks(mockBooks);
      
      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.BOOKS,
        expect.any(String)
      );
    });

    it('should include metadata when saving', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      await saveBooks(mockBooks);
      
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveProperty('books', mockBooks);
      expect(savedData).toHaveProperty('lastModified');
      expect(savedData).toHaveProperty('version', '1.0');
      expect(savedData).toHaveProperty('deviceInfo');
      expect(savedData.deviceInfo).toHaveProperty('platform', 'ios');
    });

    it('should handle save errors', async () => {
      const error = new Error('Storage full');
      AsyncStorage.setItem.mockRejectedValue(error);
      
      const result = await saveBooks(mockBooks);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');
    });

    it('should reject data exceeding size limit', async () => {
      const largeData = Array(100000).fill(mockBooks[0]);
      
      const result = await saveBooks(largeData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('storage limit');
    });
  });

  describe('loadBooks', () => {
    it('should load books with metadata', async () => {
      const mockData = {
        books: [
          { id: '1', title: 'Test Book', author: 'Test Author' }
        ],
        lastModified: '2023-01-01T00:00:00.000Z',
        version: '1.0',
        deviceInfo: { platform: 'ios' },
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));
      
      const result = await loadBooks();
      
      expect(result.books).toEqual(mockData.books);
      expect(result.metadata).toEqual({
        lastModified: mockData.lastModified,
        version: mockData.version,
        deviceInfo: mockData.deviceInfo,
      });
    });

    it('should handle legacy data format (array)', async () => {
      const legacyData = [
        { id: '1', title: 'Legacy Book', author: 'Legacy Author' }
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(legacyData));
      AsyncStorage.setItem.mockResolvedValue(); // For migration
      
      const result = await loadBooks();
      
      expect(result.books).toEqual(legacyData);
      expect(result.metadata).toBeNull();
      // Should migrate legacy data
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return empty data when no storage exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await loadBooks();
      
      expect(result.books).toEqual([]);
      expect(result.metadata).toBeNull();
    });

    it('should handle corrupted data', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');
      AsyncStorage.getAllKeys.mockResolvedValue([]);
      
      const result = await loadBooks();
      
      expect(result.books).toEqual([]);
      expect(result.metadata).toBeNull();
    });

    it('should load from backup when main data fails', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('invalid json') // Main data fails
        .mockResolvedValueOnce(JSON.stringify({ // Backup data
          books: [{ id: 'backup', title: 'Backup Book' }],
        }));
      
      AsyncStorage.getAllKeys.mockResolvedValue([
        'books_backup_1640995200000'
      ]);
      
      const result = await loadBooks();
      
      expect(result.books).toEqual([{ id: 'backup', title: 'Backup Book' }]);
      expect(result.metadata.isFromBackup).toBe(true);
    });
  });

  describe('clearAllData', () => {
    it('should clear all data by default', async () => {
      AsyncStorage.clear.mockResolvedValue();
      AsyncStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      AsyncStorage.multiGet.mockResolvedValue([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      AsyncStorage.setItem.mockResolvedValue();
      
      const result = await clearAllData();
      
      expect(result.success).toBe(true);
      expect(AsyncStorage.clear).toHaveBeenCalled();
    });

    it('should keep theme when specified', async () => {
      AsyncStorage.getAllKeys.mockResolvedValue([
        STORAGE_KEYS.BOOKS,
        STORAGE_KEYS.THEME,
        'other_key',
      ]);
      AsyncStorage.multiRemove.mockResolvedValue();
      
      const result = await clearAllData({ keepTheme: true });
      
      expect(result.success).toBe(true);
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        STORAGE_KEYS.BOOKS,
        'other_key',
      ]);
      expect(AsyncStorage.clear).not.toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      const error = new Error('Clear failed');
      AsyncStorage.clear.mockRejectedValue(error);
      
      const result = await clearAllData();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Clear failed');
    });
  });

  describe('exportBooksToJson', () => {
    const mockBooks = [
      { id: '1', title: 'Export Book', author: 'Export Author' }
    ];

    it('should export books with metadata', () => {
      const result = exportBooksToJson(mockBooks);
      const parsed = JSON.parse(result);
      
      expect(parsed.books).toEqual(mockBooks);
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('version', '1.0');
      expect(parsed).toHaveProperty('appVersion');
    });

    it('should export books without metadata when specified', () => {
      const result = exportBooksToJson(mockBooks, false);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(mockBooks);
    });

    it('should handle export errors', () => {
      // Create circular reference to cause JSON.stringify to fail
      const circularBooks = [{ id: '1' }];
      circularBooks[0].self = circularBooks[0];
      
      const result = exportBooksToJson(circularBooks);
      
      expect(result).toBeNull();
    });
  });

  describe('importBooksFromJson', () => {
    it('should import books array format', () => {
      const books = [
        { title: 'Import Book', author: 'Import Author', id: '1' }
      ];
      const jsonString = JSON.stringify(books);
      
      const result = importBooksFromJson(jsonString);
      
      expect(result.success).toBe(true);
      expect(result.books).toEqual(books);
      expect(result.metadata).toBeNull();
    });

    it('should import books with metadata format', () => {
      const exportData = {
        books: [{ title: 'Meta Book', author: 'Meta Author', id: '1' }],
        exportedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0',
        appVersion: '1.0.0',
      };
      const jsonString = JSON.stringify(exportData);
      
      const result = importBooksFromJson(jsonString);
      
      expect(result.success).toBe(true);
      expect(result.books).toEqual(exportData.books);
      expect(result.metadata).toEqual({
        exportedAt: exportData.exportedAt,
        version: exportData.version,
        appVersion: exportData.appVersion,
      });
    });

    it('should validate books when specified', () => {
      const invalidBooks = [
        { title: 'Valid Book', author: 'Valid Author' },
        { title: '', author: 'Invalid Book' }, // Empty title
        { author: 'No Title Book' }, // Missing title
        null, // Null book
      ];
      const jsonString = JSON.stringify(invalidBooks);
      
      const result = importBooksFromJson(jsonString, { validateBooks: true });
      
      expect(result.success).toBe(true);
      expect(result.books).toHaveLength(1);
      expect(result.books[0].title).toBe('Valid Book');
    });

    it('should handle invalid JSON', () => {
      const result = importBooksFromJson('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected token');
      expect(result.books).toEqual([]);
    });

    it('should handle invalid data format', () => {
      const result = importBooksFromJson(JSON.stringify({ invalid: 'data' }));
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected array of books');
      expect(result.books).toEqual([]);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      AsyncStorage.getAllKeys.mockResolvedValue(['key1', 'key2', 'key3']);
      AsyncStorage.getItem
        .mockResolvedValueOnce('small value')
        .mockResolvedValueOnce('medium value content')
        .mockResolvedValueOnce('large value with much more content');
      
      // Mock Blob for size calculation
      global.Blob = jest.fn().mockImplementation((content) => ({
        size: content[0].length,
      }));
      
      const result = await getStorageInfo();
      
      expect(result).toHaveProperty('totalKeys', 3);
      expect(result).toHaveProperty('totalSize');
      expect(result).toHaveProperty('keyInfo');
      expect(result).toHaveProperty('freeSpace');
      expect(result.keyInfo).toHaveLength(3);
      expect(result.keyInfo[0].size).toBeGreaterThanOrEqual(result.keyInfo[1].size);
    });

    it('should handle storage info errors', async () => {
      AsyncStorage.getAllKeys.mockRejectedValue(new Error('Access denied'));
      
      const result = await getStorageInfo();
      
      expect(result).toBeNull();
    });

    it('should handle individual key read errors', async () => {
      AsyncStorage.getAllKeys.mockResolvedValue(['key1', 'key2']);
      AsyncStorage.getItem
        .mockResolvedValueOnce('valid value')
        .mockRejectedValueOnce(new Error('Key read failed'));
      
      global.Blob = jest.fn().mockImplementation((content) => ({
        size: content[0].length,
      }));
      
      const result = await getStorageInfo();
      
      expect(result.totalKeys).toBe(2);
      expect(result.keyInfo).toHaveLength(1); // Only successful read
    });
  });
});