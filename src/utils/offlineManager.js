/**
 * OfflineManager - Zaawansowany system zarządzania trybem offline
 * 
 * Funkcjonalności:
 * - Automatyczne wykrywanie statusu sieci i przełączanie trybu offline/online
 * - Kolejkowanie operacji podczas trybu offline
 * - Automatyczna synchronizacja po przywróceniu połączenia internetowego
 * - Rozwiązywanie konfliktów między danymi lokalnymi a serwerowymi
 * - Lokalne przechowywanie danych książek z fallback mechanism
 * - Debounced network monitoring dla optymalnej wydajności
 * 
 * Architektura:
 * - Singleton pattern - jedna instancja dla całej aplikacji
 * - Event-driven - powiadomienia o zmianach stanu
 * - Queue-based - operacje są kolejkowane i przetwarzane sekwencyjnie
 * - Conflict resolution - strategie rozwiązywania konfliktów danych
 * 
 * @author MojeKZ Team
 * @version 2.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkStatus } from './networkStatus';
import { EnhancedErrorHandler } from './enhancedErrorHandler';
import { STORAGE_KEYS } from '../constants';

// Utility functions for data transformation
const transformBookForSupabase = (book) => ({
  title: book.title,
  author: book.author,
  description: book.description,
  cover_image: book.coverImage, // camelCase to snake_case
  status: book.status,
  rating: book.rating,
  notes: book.notes,
  date_added: book.dateAdded,
  created_at: book.created_at || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const transformBookFromSupabase = (book) => ({
  ...book,
  coverImage: book.cover_image,
  dateAdded: book.date_added,
});

/**
 * Offline Manager - Handles offline mode functionality and data synchronization
 * Provides offline storage, operation queuing, and conflict resolution
 */
export class OfflineManager {
  static isOfflineModeEnabled = false;
  static operationQueue = [];
  static conflictResolutionStrategies = new Map();
  static listeners = new Set();
  static isSyncing = false;
  static syncCheckInterval = null;

  // Storage keys for offline data
  static OFFLINE_KEYS = {
    OPERATIONS_QUEUE: 'offline_operations_queue',
    LAST_SYNC: 'offline_last_sync',
    OFFLINE_BOOKS: 'offline_books',
    OFFLINE_USER_DATA: 'offline_user_data',
    PENDING_UPLOADS: 'offline_pending_uploads',
  };

  // Operation types
  static OPERATION_TYPES = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    UPLOAD: 'UPLOAD',
  };

  /**
   * Initialize offline manager
   */
  static async initialize() {
    try {
      // Initialize NetworkStatus first
      NetworkStatus.initialize();
      console.log('📡 NetworkStatus initialized');
      
      // Load existing operation queue
      await this.loadOperationQueue();
      
      // Clean up duplicates and processed operations
      await this.removeDuplicateOperations();
      await this.clearProcessedOperations();
      
      // Set up network listener with smart debouncing
      let networkChangeTimeout = null;
      let lastNetworkState = null;
      
      NetworkStatus.addListener(async (networkState) => {
        console.log('🌐 Network state changed:', {
          isConnected: networkState.isConnected,
          isInternetReachable: networkState.isInternetReachable,
          type: networkState.type
        });
        
        // Check if this is actually a state change
        const isStateChange = !lastNetworkState || 
          lastNetworkState.isConnected !== networkState.isConnected ||
          lastNetworkState.isInternetReachable !== networkState.isInternetReachable;
        
        if (!isStateChange) {
          console.log('📡 No actual network state change, skipping...');
          return;
        }
        
        lastNetworkState = networkState;
        
        // Clear previous timeout
        if (networkChangeTimeout) {
          clearTimeout(networkChangeTimeout);
        }
        
        if (networkState.isConnected && networkState.isInternetReachable) {
          // Going online - ALWAYS try to sync if we have pending operations
          console.log('🟢 Going online. Offline mode:', this.isOfflineModeEnabled, 'Syncing:', this.isSyncing, 'Queue:', this.operationQueue.length);
          
          // Always sync if we have pending operations, regardless of offline mode
          if (this.operationQueue.length > 0 && !this.isSyncing) {
            console.log('📡 Network available with pending operations - starting immediate sync...');
            
            // Very short debounce for immediate response
            networkChangeTimeout = setTimeout(async () => {
              if (this.isOfflineModeEnabled) {
                console.log('🔄 Going online from offline mode...');
                await this.goOnline();
              } else {
                console.log('🔄 Syncing pending operations...');
                await this.syncPendingOperations();
              }
            }, 50); // Super fast - 50ms
          } else if (this.isOfflineModeEnabled && !this.isSyncing) {
            // Go online even without pending operations to update offline status
            console.log('🔄 Going online from offline mode (no pending operations)...');
            networkChangeTimeout = setTimeout(async () => {
              await this.goOnline();
            }, 100);
          }
        } else {
          // Going offline - can be slower
          console.log('🔴 Going offline. Current offline mode:', this.isOfflineModeEnabled);
          if (!this.isOfflineModeEnabled) {
            console.log('📡 Switching to offline mode...');
            networkChangeTimeout = setTimeout(async () => {
              await this.goOffline();
            }, 1000);
          }
        }
      });

      // Check network status and set initial mode
      const isOnline = await NetworkStatus.isOnline();
      console.log('🚀 App initialized. Online:', isOnline, 'Offline mode:', this.isOfflineModeEnabled, 'Queue:', this.operationQueue.length);
      
      // Set correct initial offline mode
      if (!isOnline && !this.isOfflineModeEnabled) {
        console.log('📡 No network detected, enabling offline mode...');
        await this.goOffline();
      } else if (isOnline && this.isOfflineModeEnabled) {
        console.log('📡 Network detected but in offline mode, checking for sync...');
        // Don't auto go online here, let network listener handle it
      }
      
      // Check if we should sync immediately on initialization
      if (this.operationQueue.length > 0 && isOnline) {
        console.log('🚀 Starting immediate sync on app start...');
        setTimeout(async () => {
          if (this.isOfflineModeEnabled) {
            await this.goOnline();
          } else {
            await this.syncPendingOperations();
          }
        }, 500); // Longer delay to ensure everything is ready
      }

      // Start periodic sync check if we have pending operations
      this.startSyncCheckInterval();

      console.log(`Offline Manager initialized with ${this.operationQueue.length} pending operations`);
    } catch (error) {
      console.error('Error initializing Offline Manager:', error);
    }
  }

  /**
   * Start periodic sync check for pending operations
   */
  static startSyncCheckInterval() {
    // Clear existing interval
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }
    
    // Only start if we have pending operations
    if (this.operationQueue.length === 0) {
      return;
    }
    
    console.log('🔄 Starting periodic sync check (every 10s)');
    this.syncCheckInterval = setInterval(async () => {
      if (this.operationQueue.length > 0 && !this.isSyncing) {
        console.log('⏰ Periodic sync check - checking network...');
        const isOnline = await NetworkStatus.isOnline();
        console.log('📡 Network status during periodic check:', isOnline);
        
        if (isOnline) {
          console.log('🔄 Network available during periodic check - syncing...');
          if (this.isOfflineModeEnabled) {
            await this.goOnline();
          } else {
            await this.syncPendingOperations();
          }
        }
      } else if (this.operationQueue.length === 0) {
        // Stop interval if no pending operations
        clearInterval(this.syncCheckInterval);
        this.syncCheckInterval = null;
        console.log('✅ No pending operations, stopping periodic sync check');
      }
    }, 10000); // 10 seconds - more frequent checks
  }

  /**
   * Stop periodic sync check
   */
  static stopSyncCheckInterval() {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
      console.log('⏹️ Stopped periodic sync check');
    }
  }

  /**
   * Enable offline mode
   */
  static async goOffline() {
    if (this.isOfflineModeEnabled) return;

    this.isOfflineModeEnabled = true;
    
    this.notifyListeners('offline_mode_enabled', {
      timestamp: new Date().toISOString(),
      queuedOperations: this.operationQueue.length,
      isOffline: true,
    });

    console.log('🔴 Offline mode enabled');
    
    // Force status update to ensure UI reflects the change
    this.forceStatusUpdate();
  }

  /**
   * Disable offline mode and sync pending operations
   */
  static async goOnline() {
    if (!this.isOfflineModeEnabled || this.isSyncing) return;

    console.log('🟢 Going online, syncing pending operations...');
    this.isSyncing = true;
    
    try {
      await this.syncPendingOperations();
      this.isOfflineModeEnabled = false;
      
      this.notifyListeners('online_mode_enabled', {
        timestamp: new Date().toISOString(),
        syncedOperations: this.operationQueue.length,
        isOffline: false,
        queuedOperations: this.operationQueue.length,
      });

      console.log('✅ Online mode enabled, sync completed');
      
      // Force status update to ensure UI reflects the change
      this.forceStatusUpdate();
    } catch (error) {
      console.error('❌ Error syncing operations:', error);
      // Stay in offline mode if sync fails
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Queue an operation for later execution
   */
  static async queueOperation(operation) {
    const queuedOperation = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...operation,
    };

    this.operationQueue.push(queuedOperation);
    await this.saveOperationQueue();

    this.notifyListeners('operation_queued', queuedOperation);

    // Start sync check interval if this is the first operation
    this.startSyncCheckInterval();

    return queuedOperation.id;
  }

  /**
   * Save books to offline storage
   */
  static async saveOfflineBooks(books) {
    try {
      const offlineData = {
        books,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      await AsyncStorage.setItem(
        this.OFFLINE_KEYS.OFFLINE_BOOKS,
        JSON.stringify(offlineData)
      );

      return true;
    } catch (error) {
      console.error('Error saving offline books:', error);
      return false;
    }
  }

  /**
   * Load books from offline storage
   */
  static async loadOfflineBooks() {
    try {
      const data = await AsyncStorage.getItem(this.OFFLINE_KEYS.OFFLINE_BOOKS);
      
      if (!data) return null;

      const offlineData = JSON.parse(data);
      return offlineData.books || [];
    } catch (error) {
      console.error('Error loading offline books:', error);
      return null;
    }
  }

  /**
   * Create book in offline mode
   */
  static async createBookOffline(bookData, userId = null) {
    const tempId = `offline_${Date.now()}`;
    const book = {
      ...bookData,
      id: tempId,
      offline: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add to offline storage
    const existingBooks = (await this.loadOfflineBooks()) || [];
    const updatedBooks = [...existingBooks, book];
    await this.saveOfflineBooks(updatedBooks);

    // Queue for sync
    await this.queueOperation({
      type: this.OPERATION_TYPES.CREATE,
      entity: 'book',
      data: bookData,
      tempId,
      userId,
      retryCount: 0,
    });

    return book;
  }

  /**
   * Update book in offline mode
   */
  static async updateBookOffline(bookId, updates, userId = null) {
    const existingBooks = (await this.loadOfflineBooks()) || [];
    const bookIndex = existingBooks.findIndex(book => book.id === bookId);

    if (bookIndex === -1) {
      throw new Error('Book not found in offline storage');
    }

    const updatedBook = {
      ...existingBooks[bookIndex],
      ...updates,
      updated_at: new Date().toISOString(),
      offline: true,
    };

    existingBooks[bookIndex] = updatedBook;
    await this.saveOfflineBooks(existingBooks);

    // Queue for sync
    await this.queueOperation({
      type: this.OPERATION_TYPES.UPDATE,
      entity: 'book',
      id: bookId,
      data: updates,
      userId,
      retryCount: 0,
    });

    return updatedBook;
  }

  /**
   * Delete book in offline mode
   */
  static async deleteBookOffline(bookId, userId = null) {
    const existingBooks = (await this.loadOfflineBooks()) || [];
    const filteredBooks = existingBooks.filter(book => book.id !== bookId);
    
    await this.saveOfflineBooks(filteredBooks);

    // Queue for sync
    await this.queueOperation({
      type: this.OPERATION_TYPES.DELETE,
      entity: 'book',
      id: bookId,
      userId,
      retryCount: 0,
    });

    return true;
  }

  /**
   * Sync pending operations when back online
   */
  static async syncPendingOperations() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    if (this.operationQueue.length === 0) {
      await this.updateLastSync();
      return;
    }

    this.isSyncing = true;

    const { supabase } = await import('../config/supabase');
    
    // Check if user is authenticated before attempting sync
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('No active session found, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.user) {
        console.log('No valid session available, operations will remain queued until next login');
        this.notifyListeners('sync_skipped', {
          reason: 'no_auth',
          message: 'Синхронизация отложена - требуется авторизация',
          queuedOperations: this.operationQueue.length
        });
        return { 
          successful: [], 
          failed: [], 
          conflicts: [],
          skipped: this.operationQueue.length,
          reason: 'no_auth'
        };
      }
    }
    
    const conflicts = [];
    const successfulOperations = [];
    const failedOperations = [];

    for (const operation of this.operationQueue) {
      try {
        const result = await this.executeOperation(operation, supabase);
        
        if (result.conflict) {
          conflicts.push({ operation, conflict: result.conflict });
        } else {
          successfulOperations.push(operation);
        }
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Check if it's a UUID error for offline IDs
        if (error.code === '22P02' && operation.id?.toString().startsWith('offline_')) {
          console.log(`🗑️ Removing operation with invalid offline ID: ${operation.id}`);
          failedOperations.push(operation); // Remove immediately, don't retry
          continue;
        }
        
        operation.retryCount = (operation.retryCount || 0) + 1;
        
        if (operation.retryCount >= 3) {
          console.error(`⚠️ Operation ${operation.id} failed permanently after 3 retries:`, error.message);
          failedOperations.push(operation);
        } else {
          console.log(`🔁 Retrying operation ${operation.id} (attempt ${operation.retryCount + 1}/3)`);
        }
      }
    }

    // Remove successful operations from queue
    this.operationQueue = this.operationQueue.filter(op =>
      !successfulOperations.some(successOp => successOp.id === op.id)
    );

    // Remove permanently failed operations
    this.operationQueue = this.operationQueue.filter(op =>
      !failedOperations.some(failedOp => failedOp.id === op.id)
    );

    // Handle conflicts
    for (const conflictInfo of conflicts) {
      await this.resolveConflict(conflictInfo.operation, conflictInfo.conflict);
    }

    try {
      // Update storage
      await this.saveOperationQueue();
      await this.updateLastSync();

      this.notifyListeners('sync_completed', {
        successful: successfulOperations.length,
        failed: failedOperations.length,
        conflicts: conflicts.length,
      });

      // Restart sync check interval if we still have pending operations
      this.startSyncCheckInterval();

      return {
        successful: successfulOperations,
        failed: failedOperations,
        conflicts,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a queued operation
   */
  static async executeOperation(operation, supabase) {
    switch (operation.entity) {
      case 'book':
        return await this.executeBookOperation(operation, supabase);
      default:
        throw new Error(`Unknown entity: ${operation.entity}`);
    }
  }

  /**
   * Execute book-related operations
   */
  static async executeBookOperation(operation, supabase) {
    // Get current user from Supabase session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Try to refresh session if it's invalid
    if (sessionError || !session?.user) {
      console.log('Session invalid, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.user) {
        console.log('Session refresh failed, operation will be kept for later');
        // Don't throw error, just return failure so operation stays in queue
        return { success: false, needsAuth: true };
      }
      
      session = refreshData.session;
    }
    
    const userId = session.user.id;
    
    switch (operation.type) {
      case this.OPERATION_TYPES.CREATE: {
        console.log(`Executing CREATE operation for "${operation.data.title}" by "${operation.data.author}"`);
        
        try {
        
        // Check if this tempId was already processed
        if (operation.tempId) {
          const existingBooks = await this.loadOfflineBooks();
          const existingBook = existingBooks?.find(book => 
            book.id !== operation.tempId && book.title === operation.data.title && book.author === operation.data.author
          );
          
          if (existingBook && !existingBook.id.toString().startsWith('offline_')) {
            console.log(`✅ Book with tempId ${operation.tempId} already exists with real ID ${existingBook.id}, skipping`);
            await this.replaceTempId(operation.tempId, existingBook.id);
            return { success: true, data: existingBook, alreadyExists: true };
          }
        }

        // Check if book already exists in Supabase
        console.log('🔍 Checking if book already exists in database...');
        const { data: existingData, error: checkError } = await supabase
          .from('books')
          .select('id, title, author')
          .eq('user_id', userId)
          .ilike('title', operation.data.title)
          .ilike('author', operation.data.author);

        if (checkError) {
          console.error('❌ Error checking existing books:', checkError);
        } else if (existingData && existingData.length > 0) {
          console.log(`✅ Book already exists in database with ID ${existingData[0].id}, skipping creation`);
          if (operation.tempId) {
            await this.replaceTempId(operation.tempId, existingData[0].id);
          }
          return { success: true, data: existingData[0], alreadyExists: true };
        }

        // Transform data for Supabase
        const supabaseBook = {
          ...transformBookForSupabase(operation.data),
          user_id: userId,
        };
        
        console.log('📤 Inserting new book into database...');

        const { data, error } = await supabase
          .from('books')
          .insert([supabaseBook])
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            console.log('⚠️ Duplicate key error - book already exists in database');
            return { success: true, data: null, alreadyExists: true };
          }
          throw error;
        }

        console.log(`✅ Successfully created book in database with ID ${data.id}`);

        // Update offline storage with real ID
        if (operation.tempId) {
          await this.replaceTempId(operation.tempId, data.id);
          console.log(`🔄 Replaced tempId ${operation.tempId} with real ID ${data.id}`);
        }

        return { success: true, data: transformBookFromSupabase(data) };
        
        } catch (error) {
          console.error('Error creating book:', error);
          throw error;
        }
      }

      case this.OPERATION_TYPES.UPDATE: {
        // Skip update operation if ID is a temporary offline ID
        if (operation.id && operation.id.toString().startsWith('offline_')) {
          console.log(`⚠️ Skipping UPDATE operation for offline ID: ${operation.id}`);
          return { success: true, skipped: true };
        }

        // Check for conflicts
        const { data: currentData, error: fetchError } = await supabase
          .from('books')
          .select('updated_at')
          .eq('id', operation.id)
          .single();

        if (fetchError) throw fetchError;

        const serverUpdateTime = new Date(currentData.updated_at);
        const localUpdateTime = new Date(operation.timestamp);

        if (serverUpdateTime > localUpdateTime) {
          return { conflict: { server: currentData, local: operation.data } };
        }

        // Transform data for Supabase
        const supabaseBook = transformBookForSupabase(operation.data);
        
        const { data, error } = await supabase
          .from('books')
          .update(supabaseBook)
          .eq('id', operation.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;

        return { success: true, data: transformBookFromSupabase(data) };
      }

      case this.OPERATION_TYPES.DELETE: {
        // Skip delete operation if ID is a temporary offline ID
        if (operation.id && operation.id.toString().startsWith('offline_')) {
          console.log(`⚠️ Skipping DELETE operation for offline ID: ${operation.id}`);
          return { success: true, skipped: true };
        }

        const { error } = await supabase
          .from('books')
          .delete()
          .eq('id', operation.id)
          .eq('user_id', userId);

        if (error) throw error;

        return { success: true };
      }

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Resolve sync conflicts
   */
  static async resolveConflict(operation, conflict) {
    const strategy = this.conflictResolutionStrategies.get(operation.entity) || 'client_wins';

    switch (strategy) {
      case 'server_wins':
        // Server data takes precedence
        await this.updateLocalData(operation.entity, operation.id, conflict.server);
        break;

      case 'client_wins':
        // Force update server with client data
        await this.forceServerUpdate(operation);
        break;

      case 'merge':
        // Merge client and server data
        const merged = await this.mergeData(conflict.local, conflict.server);
        await this.forceServerUpdate({ ...operation, data: merged });
        break;

      case 'user_choice':
        // Let user decide
        this.notifyListeners('conflict_requires_resolution', {
          operation,
          conflict,
        });
        break;

      default:
        console.warn(`Unknown conflict resolution strategy: ${strategy}`);
        break;
    }
  }

  /**
   * Set conflict resolution strategy for an entity type
   */
  static setConflictResolutionStrategy(entity, strategy) {
    this.conflictResolutionStrategies.set(entity, strategy);
  }

  /**
   * Replace temporary ID with real ID in offline storage
   */
  static async replaceTempId(tempId, realId) {
    const books = (await this.loadOfflineBooks()) || [];
    const bookIndex = books.findIndex(book => book.id === tempId);
    
    if (bookIndex !== -1) {
      books[bookIndex].id = realId;
      books[bookIndex].offline = false;
      await this.saveOfflineBooks(books);
    }
  }

  /**
   * Save operation queue to storage
   */
  static async saveOperationQueue() {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_KEYS.OPERATIONS_QUEUE,
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.error('Error saving operation queue:', error);
    }
  }

  /**
   * Load operation queue from storage
   */
  static async loadOperationQueue() {
    try {
      const data = await AsyncStorage.getItem(this.OFFLINE_KEYS.OPERATIONS_QUEUE);
      this.operationQueue = data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading operation queue:', error);
      this.operationQueue = [];
    }
  }

  /**
   * Update last sync timestamp
   */
  static async updateLastSync() {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSync() {
    try {
      const timestamp = await AsyncStorage.getItem(this.OFFLINE_KEYS.LAST_SYNC);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  /**
   * Clear processed operations from queue
   */
  static async clearProcessedOperations() {
    const unprocessedOperations = this.operationQueue.filter(op => !op.processed);
    this.operationQueue = unprocessedOperations;
    await this.saveOperationQueue();
    console.log(`Cleared processed operations, ${unprocessedOperations.length} operations remaining`);
  }

  /**
   * Remove duplicate operations from queue
   */
  static async removeDuplicateOperations() {
    const uniqueOperations = [];
    const seen = new Map();

    for (const operation of this.operationQueue) {
      let key;
      
      // Create more specific keys for different operation types
      if (operation.type === this.OPERATION_TYPES.CREATE && operation.data) {
        key = `${operation.type}_${operation.entity}_${operation.data.title}_${operation.data.author}`;
      } else if (operation.type === this.OPERATION_TYPES.UPDATE || operation.type === this.OPERATION_TYPES.DELETE) {
        key = `${operation.type}_${operation.entity}_${operation.id || operation.tempId}`;
      } else {
        key = `${operation.type}_${operation.entity}_${operation.tempId || operation.id}`;
      }
      
      if (!seen.has(key)) {
        seen.set(key, operation);
        uniqueOperations.push(operation);
      } else {
        const existing = seen.get(key);
        console.log(`Removing duplicate operation: ${operation.id} (keeping ${existing.id})`);
        
        // Keep the operation with the earliest timestamp
        if (new Date(operation.timestamp) < new Date(existing.timestamp)) {
          // Replace existing with earlier operation
          const existingIndex = uniqueOperations.findIndex(op => op.id === existing.id);
          if (existingIndex !== -1) {
            uniqueOperations[existingIndex] = operation;
            seen.set(key, operation);
          }
        }
      }
    }

    const removedCount = this.operationQueue.length - uniqueOperations.length;
    this.operationQueue = uniqueOperations;
    await this.saveOperationQueue();
    console.log(`Removed ${removedCount} duplicates, ${uniqueOperations.length} unique operations remaining`);
  }

  /**
   * Clear all offline data
   */
  static async clearOfflineData() {
    try {
      await AsyncStorage.multiRemove([
        this.OFFLINE_KEYS.OPERATIONS_QUEUE,
        this.OFFLINE_KEYS.OFFLINE_BOOKS,
        this.OFFLINE_KEYS.OFFLINE_USER_DATA,
        this.OFFLINE_KEYS.PENDING_UPLOADS,
      ]);

      this.operationQueue = [];
      
      console.log('🗑️ Cleared all offline data');
      
      this.notifyListeners('offline_data_cleared');
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Get offline status and statistics
   */
  static getOfflineStatus() {
    return {
      isOffline: this.isOfflineModeEnabled,
      queuedOperations: this.operationQueue.length,
      operationsByType: this.operationQueue.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  /**
   * Force status update to all listeners
   */
  static forceStatusUpdate() {
    const status = this.getOfflineStatus();
    console.log('🔄 Forcing status update:', status);
    this.notifyListeners('status_updated', status);
  }

  /**
   * Add event listener
   */
  static addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  static notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in offline manager listener:', error);
      }
    });
  }

  /**
   * Force sync (manual trigger)
   */
  static async forceSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping force sync...');
      return;
    }

    if (!this.isOfflineModeEnabled) {
      const isOnline = await NetworkStatus.isOnline();
      if (isOnline) {
        // Clean up before sync
        await this.removeDuplicateOperations();
        return await this.syncPendingOperations();
      }
    }
    
    throw new Error('Cannot sync while offline');
  }

  /**
   * Check network status and sync if needed (for app resume/foreground)
   */
  static async checkAndSync() {
    try {
      const isOnline = await NetworkStatus.isOnline();
      
      if (isOnline && this.operationQueue.length > 0) {
        if (this.isOfflineModeEnabled) {
          console.log('🔄 App resumed online with pending operations - syncing...');
          await this.goOnline();
        } else if (!this.isSyncing) {
          console.log('🔄 Checking for pending operations to sync...');
          await this.removeDuplicateOperations();
          await this.syncPendingOperations();
        }
      }
    } catch (error) {
      console.error('Error in checkAndSync:', error);
    }
  }

  /**
   * Force clear all pending operations (for debugging)
   */
  static async forceClearQueue() {
    this.operationQueue = [];
    await this.saveOperationQueue();
    console.log('Force cleared all pending operations');
    this.notifyListeners('queue_cleared');
  }

  /**
   * Clear execution locks (for debugging)
   */
  static clearLocks() {
    console.log('🔓 Lock clearing not needed in simplified version');
  }

  /**
   * Merge local and server data
   */
  static async mergeData(localData, serverData) {
    // Default merge strategy: local data takes precedence for user-modified fields
    return {
      ...serverData,
      ...localData,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Force server update
   */
  static async forceServerUpdate(operation) {
    const { supabase } = await import('../config/supabase');
    
    // Get current user from session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Try to refresh session if it's invalid
    if (sessionError || !session?.user) {
      console.log('Session invalid for force update, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.user) {
        throw new Error('No active session found. Please log in again.');
      }
      
      session = refreshData.session;
    }
    
    const supabaseBook = {
      ...transformBookForSupabase(operation.data),
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('books')
      .update(supabaseBook)
      .eq('id', operation.id)
      .eq('user_id', session.user.id);

    if (error) throw error;
  }

  /**
   * Update local data
   */
  static async updateLocalData(entity, id, data) {
    if (entity === 'book') {
      const books = (await this.loadOfflineBooks()) || [];
      const bookIndex = books.findIndex(book => book.id === id);
      
      if (bookIndex !== -1) {
        books[bookIndex] = { ...books[bookIndex], ...data };
        await this.saveOfflineBooks(books);
      }
    }
  }
}

/**
 * React hook for offline functionality
 */
export const useOfflineManager = () => {
  const [isOffline, setIsOffline] = React.useState(OfflineManager.isOfflineModeEnabled);
  const [queuedOperations, setQueuedOperations] = React.useState(0);
  const [lastSync, setLastSync] = React.useState(null);

  React.useEffect(() => {
    const updateStatus = () => {
      const status = OfflineManager.getOfflineStatus();
      setIsOffline(status.isOffline);
      setQueuedOperations(status.queuedOperations);
    };

    const loadLastSync = async () => {
      const sync = await OfflineManager.getLastSync();
      setLastSync(sync);
    };

    updateStatus();
    loadLastSync();

    const unsubscribe = OfflineManager.addListener((event) => {
      updateStatus();
      
      if (event === 'sync_completed') {
        loadLastSync();
      }
    });

    return unsubscribe;
  }, []);

  return {
    isOffline,
    queuedOperations,
    lastSync,
    forceSync: OfflineManager.forceSync,
    checkAndSync: OfflineManager.checkAndSync,
    clearOfflineData: OfflineManager.clearOfflineData,
    getOfflineBooks: OfflineManager.loadOfflineBooks,
  };
};

export default OfflineManager;