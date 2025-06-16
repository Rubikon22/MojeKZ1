import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS, APP_CONFIG } from '../constants';

// Storage configuration
const STORAGE_CONFIG = {
  MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB limit
  COMPRESSION_THRESHOLD: 1024 * 1024, // 1MB
  BACKUP_RETENTION_DAYS: 30,
};

// Enhanced save books with error handling and metadata
export const saveBooks = async (books) => {
  try {
    const dataToSave = {
      books,
      lastModified: new Date().toISOString(),
      version: '1.0',
      deviceInfo: {
        platform: Platform.OS,
        timestamp: Date.now(),
      },
    };
    
    const serializedData = JSON.stringify(dataToSave);
    
    // Check storage size
    if (serializedData.length > STORAGE_CONFIG.MAX_STORAGE_SIZE) {
      throw new Error('Data size exceeds storage limit');
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, serializedData);
    
    // Save backup copy
    await createBackup(serializedData);
    
    return { success: true, size: serializedData.length };
  } catch (error) {
    console.error('Error saving books to storage:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced load books with fallback and migration
export const loadBooks = async () => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEYS.BOOKS);
    
    if (!storedData) {
      return { books: [], metadata: null };
    }
    
    const parsedData = JSON.parse(storedData);
    
    // Handle legacy format (array of books)
    if (Array.isArray(parsedData)) {
      await migrateLegacyData(parsedData);
      return { books: parsedData, metadata: null };
    }
    
    // Handle new format with metadata
    if (parsedData.books && Array.isArray(parsedData.books)) {
      return {
        books: parsedData.books,
        metadata: {
          lastModified: parsedData.lastModified,
          version: parsedData.version,
          deviceInfo: parsedData.deviceInfo,
        },
      };
    }
    
    throw new Error('Invalid data format');
    
  } catch (error) {
    console.error('Error loading books from storage:', error);
    
    // Try to load from backup
    const backupData = await loadFromBackup();
    if (backupData) {
      return backupData;
    }
    
    return { books: [], metadata: null };
  }
};

// Enhanced clear data with selective clearing
export const clearAllData = async (options = {}) => {
  try {
    const { keepTheme = false, createBackup = true } = options;
    
    if (createBackup) {
      await createFullBackup();
    }
    
    if (keepTheme) {
      // Clear all except theme
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => key !== STORAGE_KEYS.THEME);
      await AsyncStorage.multiRemove(keysToRemove);
    } else {
      await AsyncStorage.clear();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing storage:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced export with metadata
export const exportBooksToJson = (books, includeMetadata = true) => {
  try {
    const exportData = {
      books,
      exportedAt: new Date().toISOString(),
      version: '1.0',
      appVersion: APP_CONFIG.VERSION || '1.0.0',
    };
    
    return JSON.stringify(includeMetadata ? exportData : books, null, 2);
  } catch (error) {
    console.error('Error exporting books to JSON:', error);
    return null;
  }
};

// Enhanced import with validation
export const importBooksFromJson = (jsonString, options = {}) => {
  try {
    const { validateBooks = true, mergeWithExisting = false } = options;
    const parsedData = JSON.parse(jsonString);
    
    let books = [];
    
    // Handle different import formats
    if (Array.isArray(parsedData)) {
      books = parsedData;
    } else if (parsedData.books && Array.isArray(parsedData.books)) {
      books = parsedData.books;
    } else {
      throw new Error('Invalid data format: Expected array of books');
    }
    
    // Validate book structure
    if (validateBooks) {
      books = books.filter(book => {
        return book && 
               typeof book.title === 'string' && 
               typeof book.author === 'string' &&
               book.title.trim() !== '' &&
               book.author.trim() !== '';
      });
    }
    
    return {
      success: true,
      books,
      metadata: parsedData.exportedAt ? {
        exportedAt: parsedData.exportedAt,
        version: parsedData.version,
        appVersion: parsedData.appVersion,
      } : null,
    };
    
  } catch (error) {
    console.error('Error importing books from JSON:', error);
    return {
      success: false,
      error: error.message,
      books: [],
      metadata: null,
    };
  }
};

// Storage quota management
export const getStorageInfo = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;
    const keyInfo = [];
    
    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        const size = value ? new Blob([value]).size : 0;
        totalSize += size;
        keyInfo.push({ key, size });
      } catch (error) {
        console.warn(`Error reading key ${key}:`, error);
      }
    }
    
    return {
      totalKeys: keys.length,
      totalSize,
      keyInfo: keyInfo.sort((a, b) => b.size - a.size),
      freeSpace: STORAGE_CONFIG.MAX_STORAGE_SIZE - totalSize,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
};

// Backup functionality
const createBackup = async (data) => {
  try {
    const backupKey = `${STORAGE_KEYS.BOOKS}_backup_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, data);
    
    // Clean old backups
    await cleanOldBackups();
  } catch (error) {
    console.warn('Failed to create backup:', error);
  }
};

const loadFromBackup = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backupKeys = keys
      .filter(key => key.startsWith(`${STORAGE_KEYS.BOOKS}_backup_`))
      .sort((a, b) => {
        const timeA = parseInt(a.split('_').pop());
        const timeB = parseInt(b.split('_').pop());
        return timeB - timeA; // Most recent first
      });
    
    if (backupKeys.length > 0) {
      const backupData = await AsyncStorage.getItem(backupKeys[0]);
      if (backupData) {
        const parsedData = JSON.parse(backupData);
        return {
          books: parsedData.books || parsedData,
          metadata: parsedData.lastModified ? {
            lastModified: parsedData.lastModified,
            isFromBackup: true,
          } : null,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading from backup:', error);
    return null;
  }
};

const cleanOldBackups = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const backupKeys = keys.filter(key => key.startsWith(`${STORAGE_KEYS.BOOKS}_backup_`));
    
    const cutoffTime = Date.now() - (STORAGE_CONFIG.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    const oldBackups = backupKeys.filter(key => {
      const timestamp = parseInt(key.split('_').pop());
      return timestamp < cutoffTime;
    });
    
    if (oldBackups.length > 0) {
      await AsyncStorage.multiRemove(oldBackups);
    }
  } catch (error) {
    console.warn('Error cleaning old backups:', error);
  }
};

const createFullBackup = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const allData = await AsyncStorage.multiGet(keys);
    
    const backupData = {
      timestamp: Date.now(),
      data: Object.fromEntries(allData),
    };
    
    const backupKey = `full_backup_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
  } catch (error) {
    console.warn('Failed to create full backup:', error);
  }
};

const migrateLegacyData = async (legacyBooks) => {
  try {
    const migratedData = {
      books: legacyBooks,
      lastModified: new Date().toISOString(),
      version: '1.0',
      migrated: true,
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(migratedData));
    console.log('Successfully migrated legacy data');
  } catch (error) {
    console.error('Error migrating legacy data:', error);
  }
};