/**
 * OptimizedBookContext - Główny kontekst zarządzania księgozbiorem
 * 
 * Zapewnia:
 * - Zarządzanie stanem książek z optymalizacją wydajności
 * - Synchronizację offline/online z automatycznym wykrywaniem sieci
 * - Operacje CRUD z optymistycznymi aktualizacjami
 * - Obsługę błędów i fallback do lokalnego storage
 * - Integrację z Supabase i lokalnym AsyncStorage
 * 
 * @author MojeKZ Team
 * @version 2.0
 */

import React, { 
  createContext, 
  useReducer, 
  useEffect, 
  useContext, 
  useCallback, 
  useMemo,
  useRef 
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { AuthContext } from './AuthContext';
import { STORAGE_KEYS, ERROR_MESSAGES } from '../constants';
import { OfflineManager } from '../utils/offlineManager';
import { NetworkStatus } from '../utils/networkStatus';

// Stałe statusów książek - definiują możliwe stany czytelnicze
export const BOOK_STATUS = {
  READ: 'Przeczytana',           // Książka została przeczytana
  READING: 'Czytam',             // Obecnie czytana książka
  WANT_TO_READ: 'Chce przeczytac', // Książka na liście "do przeczytania"
};

// Rozdzielone konteksty dla lepszej wydajności - pattern Context Splitting
// Pozwala komponentom subskrybować tylko potrzebne części stanu
const BookStateContext = createContext();    // Stan książek (tylko odczyt)
const BookActionsContext = createContext();  // Akcje (funkcje modyfikujące stan)

// Nazwy kontekstów dla debugowania w React DevTools
BookStateContext.displayName = 'BookStateContext';
BookActionsContext.displayName = 'BookActionsContext';

// Stan początkowy aplikacji - struktura optimized dla wydajności
const initialState = {
  books: [],                     // Lista książek użytkownika
  loading: {                     // Granularny stan ładowania dla różnych operacji
    fetch: false,                // Ładowanie listy książek
    add: false,                  // Dodawanie nowej książki
    update: false,               // Aktualizacja książki
    delete: false,               // Usuwanie książki
    clear: false,                // Czyszczenie wszystkich książek
  },
  error: null,                   // Aktualny błąd (jeśli wystąpił)
  lastUpdated: null,             // Timestamp ostatniej aktualizacji
  syncStatus: 'idle',            // Status synchronizacji: 'idle', 'syncing', 'synced', 'error'
  isOffline: false,              // Czy aplikacja jest w trybie offline
  queuedOperations: 0,           // Liczba operacji oczekujących na synchronizację
};

// Enhanced reducer with more granular loading states
const bookReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.operation]: action.loading,
        },
      };

    case 'FETCH_BOOKS_START':
      return {
        ...state,
        loading: { ...state.loading, fetch: true },
        error: null,
      };

    case 'FETCH_BOOKS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, fetch: false },
        books: action.payload,
        error: null,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'synced',
      };

    case 'FETCH_BOOKS_ERROR':
      return {
        ...state,
        loading: { ...state.loading, fetch: false },
        error: action.payload,
        syncStatus: 'error',
      };

    case 'ADD_BOOK_START':
      return {
        ...state,
        loading: { ...state.loading, add: true },
        error: null,
      };

    case 'ADD_BOOK_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, add: false },
        books: [...state.books, action.payload],
        error: null,
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_BOOK_ERROR':
      return {
        ...state,
        loading: { ...state.loading, add: false },
        error: action.payload,
      };

    case 'UPDATE_BOOK_START':
      return {
        ...state,
        loading: { ...state.loading, update: true },
        error: null,
      };

    case 'UPDATE_BOOK_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, update: false },
        books: state.books.map(book => 
          book.id === action.payload.id ? action.payload : book
        ),
        error: null,
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_BOOK_ERROR':
      return {
        ...state,
        loading: { ...state.loading, update: false },
        error: action.payload,
      };

    case 'DELETE_BOOK_START':
      return {
        ...state,
        loading: { ...state.loading, delete: true },
        error: null,
      };

    case 'DELETE_BOOK_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, delete: false },
        books: state.books.filter(book => book.id !== action.payload),
        error: null,
        lastUpdated: new Date().toISOString(),
      };

    case 'DELETE_BOOK_ERROR':
      return {
        ...state,
        loading: { ...state.loading, delete: false },
        error: action.payload,
      };

    case 'CLEAR_ALL_BOOKS_START':
      return {
        ...state,
        loading: { ...state.loading, clear: true },
        error: null,
      };

    case 'CLEAR_ALL_BOOKS_SUCCESS':
      return {
        ...state,
        loading: { ...state.loading, clear: false },
        books: [],
        error: null,
        lastUpdated: new Date().toISOString(),
      };

    case 'CLEAR_ALL_BOOKS_ERROR':
      return {
        ...state,
        loading: { ...state.loading, clear: false },
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.payload,
      };

    case 'SET_OFFLINE_STATUS':
      return {
        ...state,
        isOffline: action.payload.isOffline,
        queuedOperations: action.payload.queuedOperations || 0,
      };

    case 'UPDATE_OFFLINE_QUEUE':
      return {
        ...state,
        queuedOperations: action.payload,
      };

    default:
      return state;
  }
};

// Utility functions for data transformation
const transformBookForSupabase = (book) => ({
  title: book.title,
  author: book.author,
  description: book.description,
  cover_image: book.coverImage,
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

// Provider component
export const OptimizedBookProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bookReducer, initialState);
  const authContext = useContext(AuthContext);
  
  
  // Safely extract user with proper error handling
  const user = React.useMemo(() => {
    try {
      // Check if authContext exists and has the expected structure
      if (!authContext || typeof authContext !== 'object') {
        console.warn('AuthContext is not properly initialized');
        return null;
      }
      return authContext.user || null;
    } catch (error) {
      console.error('Error accessing auth context:', error);
      return null;
    }
  }, [authContext]);

  // Add safety check for authContext
  const isAuthReady = React.useMemo(() => {
    return authContext && typeof authContext === 'object' && 'loading' in authContext;
  }, [authContext]);
  
  // Use ref to track mounted state
  const mountedRef = useRef(true);
  
  // Cache for optimistic updates
  const optimisticUpdatesRef = useRef(new Map());
  
  // Ref to track sync completion debounce
  const syncDebounceRef = useRef(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Add AppState listener for auto-sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 AppState changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking for sync...');
        // Small delay to ensure everything is ready
        setTimeout(async () => {
          const status = OfflineManager.getOfflineStatus();
          console.log('📱 Current offline status:', status);
          
          if (status.queuedOperations > 0) {
            console.log('📱 Found pending operations, checking network and syncing...');
            await OfflineManager.checkAndSync();
          }
          
          // Force status update to refresh UI
          OfflineManager.forceStatusUpdate();
        }, 100);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Initialize offline manager and load books
  useEffect(() => {
    // Only proceed if auth context is ready
    if (!isAuthReady) {
      console.log('Waiting for auth context to initialize...');
      return;
    }

    const initializeApp = async () => {
      try {
        // Initialize offline manager
        await OfflineManager.initialize();
        
        // Set up offline status listener
        const unsubscribe = OfflineManager.addListener((event, data) => {
          console.log('📡 OfflineManager event received:', event, data);
          
          const status = OfflineManager.getOfflineStatus();
          console.log('📊 Current offline status:', status);
          
          dispatch({ 
            type: 'SET_OFFLINE_STATUS', 
            payload: { 
              isOffline: status.isOffline, 
              queuedOperations: status.queuedOperations 
            } 
          });
          
          // Handle specific events
          if (event === 'online_mode_enabled') {
            console.log('🟢 Online mode enabled event received');
            dispatch({ 
              type: 'SET_OFFLINE_STATUS', 
              payload: { 
                isOffline: false, 
                queuedOperations: status.queuedOperations 
              } 
            });
          }
          
          if (event === 'offline_mode_enabled') {
            console.log('🔴 Offline mode enabled event received');
            dispatch({ 
              type: 'SET_OFFLINE_STATUS', 
              payload: { 
                isOffline: true, 
                queuedOperations: status.queuedOperations 
              } 
            });
          }

          if (event === 'status_updated') {
            console.log('📊 Status update event received');
            dispatch({ 
              type: 'SET_OFFLINE_STATUS', 
              payload: { 
                isOffline: status.isOffline, 
                queuedOperations: status.queuedOperations 
              } 
            });
          }
          
          if (event === 'sync_completed') {
            console.log('✅ Sync completed event received');
            // Debounce reload books after sync to prevent multiple rapid reloads
            if (syncDebounceRef.current) {
              clearTimeout(syncDebounceRef.current);
            }
            syncDebounceRef.current = setTimeout(() => {
              refetchBooks();
            }, 1000);
          }
        });

        // Load initial books
        if (user) {
          await loadBooksFromSupabase();
        } else {
          await loadBooksFromStorage();
        }

        // Check for pending operations after loading books
        setTimeout(async () => {
          const status = OfflineManager.getOfflineStatus();
          if (status.queuedOperations > 0) {
            console.log('📚 Found pending operations after book loading, checking for sync...');
            await OfflineManager.checkAndSync();
          }
        }, 500);

        return unsubscribe;
      } catch (error) {
        console.error('Error in app initialization:', error);
        if (mountedRef.current) {
          dispatch({ type: 'FETCH_BOOKS_ERROR', payload: error.message });
        }
      }
    };

    const cleanup = initializeApp();
    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
      cleanup.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [user, isAuthReady, loadBooksFromSupabase, loadBooksFromStorage, refetchBooks]);

  // Optimized save to AsyncStorage with debouncing
  const saveToStorageDebounced = useCallback(
    debounce(async (books) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      } catch (error) {
        console.error('Error saving books to AsyncStorage:', error);
      }
    }, 1000),
    []
  );

  // Save books to AsyncStorage whenever they change (debounced)
  useEffect(() => {
    if (state.books.length > 0 && mountedRef.current) {
      saveToStorageDebounced(state.books);
    }
  }, [state.books, saveToStorageDebounced]);

  const loadBooksFromStorage = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      dispatch({ type: 'FETCH_BOOKS_START' });
      
      // Try loading from offline manager first
      const offlineBooks = await OfflineManager.loadOfflineBooks();
      if (offlineBooks && offlineBooks.length > 0) {
        if (mountedRef.current) {
          dispatch({ type: 'FETCH_BOOKS_SUCCESS', payload: offlineBooks });
        }
        return;
      }

      // Fallback to regular storage
      const storedBooks = await AsyncStorage.getItem(STORAGE_KEYS.BOOKS);
      const books = storedBooks ? JSON.parse(storedBooks) : [];
      
      if (mountedRef.current) {
        dispatch({ type: 'FETCH_BOOKS_SUCCESS', payload: books });
      }
    } catch (error) {
      if (mountedRef.current) {
        dispatch({ type: 'FETCH_BOOKS_ERROR', payload: error.message });
      }
    }
  }, []);

  const loadBooksFromSupabase = useCallback(async () => {
    if (!mountedRef.current || !user) return;
    
    try {
      dispatch({ type: 'FETCH_BOOKS_START' });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const clientBooks = (data || []).map(transformBookFromSupabase);
      
      if (mountedRef.current) {
        dispatch({ type: 'FETCH_BOOKS_SUCCESS', payload: clientBooks });
        // Save to offline storage for backup
        await OfflineManager.saveOfflineBooks(clientBooks);
      }
    } catch (error) {
      console.error('Error loading books from Supabase:', error);
      if (mountedRef.current) {
        // Check if it's a network error
        const isNetworkError = error.message?.includes('Network request failed') || 
                              error.message?.includes('fetch') ||
                              error.code === 'NETWORK_ERROR';
        
        if (isNetworkError) {
          console.log('📡 Network error detected, switching to offline mode');
          // Trigger offline mode if it's a network error
          await OfflineManager.goOffline();
        }
        
        dispatch({ type: 'FETCH_BOOKS_ERROR', payload: error.message });
        // Fallback to local storage
        await loadBooksFromStorage();
      }
    }
  }, [user, loadBooksFromStorage]);

  // Optimized action creators with optimistic updates and offline support
  const addBook = useCallback(async (book) => {
    if (!mountedRef.current) return;
    
    // Check if book already exists locally to prevent duplicates
    const existingBook = state.books.find(existingBook => 
      existingBook.title.toLowerCase() === book.title.toLowerCase() && 
      existingBook.author.toLowerCase() === book.author.toLowerCase()
    );
    
    if (existingBook) {
      console.warn('Book already exists locally:', book.title);
      return existingBook;
    }
    
    try {
      dispatch({ type: 'ADD_BOOK_START' });
      
      const newBook = {
        ...book,
        dateAdded: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Check if we're offline
      const isOnline = await NetworkStatus.isOnline();
      console.log('📱 AddBook - Network status:', { isOnline, offlineMode: OfflineManager.isOfflineModeEnabled });
      
      if (!isOnline || OfflineManager.isOfflineModeEnabled) {
        console.log('OptimizedBookContext: Adding book offline');
        
        // Ensure we're in offline mode if not online
        if (!isOnline && !OfflineManager.isOfflineModeEnabled) {
          await OfflineManager.goOffline();
        }
        
        const offlineBook = await OfflineManager.createBookOffline(newBook, user?.id);
        
        if (mountedRef.current) {
          dispatch({ type: 'ADD_BOOK_SUCCESS', payload: offlineBook });
          dispatch({ type: 'UPDATE_OFFLINE_QUEUE', payload: OfflineManager.getOfflineStatus().queuedOperations });
        }
        return offlineBook;
      }

      if (user && isOnline) {
        // Optimistic update
        const tempId = `temp_${Date.now()}`;
        const optimisticBook = { ...newBook, id: tempId };
        
        dispatch({ type: 'ADD_BOOK_SUCCESS', payload: optimisticBook });
        optimisticUpdatesRef.current.set(tempId, optimisticBook);
        
        try {
          // Verify session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session?.user) {
            throw new Error('No active session found. Please log in again.');
          }
          
          const supabaseBook = {
            ...transformBookForSupabase(newBook),
            user_id: user.id,
          };
          
          const { data, error } = await supabase
            .from('books')
            .insert([supabaseBook])
            .select()
            .single();

          if (error) throw error;
          
          // Replace optimistic update with real data
          const realBook = transformBookFromSupabase(data);
          
          if (mountedRef.current) {
            dispatch({ 
              type: 'UPDATE_BOOK_SUCCESS', 
              payload: { ...realBook, tempId } 
            });
            optimisticUpdatesRef.current.delete(tempId);
          }
          
          return realBook;
        } catch (supabaseError) {
          // Revert optimistic update
          if (mountedRef.current) {
            dispatch({ type: 'DELETE_BOOK_SUCCESS', payload: tempId });
            optimisticUpdatesRef.current.delete(tempId);
          }
          throw supabaseError;
        }
      } else {
        // Local storage only
        newBook.id = Date.now().toString();
        if (mountedRef.current) {
          dispatch({ type: 'ADD_BOOK_SUCCESS', payload: newBook });
        }
        return newBook;
      }
    } catch (error) {
      console.error('Error adding book:', error);
      if (mountedRef.current) {
        dispatch({ type: 'ADD_BOOK_ERROR', payload: error.message });
      }
      throw error;
    }
  }, [user]);

  const updateBook = useCallback(async (book) => {
    if (!mountedRef.current) return;
    
    try {
      dispatch({ type: 'UPDATE_BOOK_START' });
      
      const isOnline = await NetworkStatus.isOnline();
      
      if (!isOnline || OfflineManager.isOfflineModeEnabled) {
        console.log('OptimizedBookContext: Updating book offline');
        const updatedBook = await OfflineManager.updateBookOffline(book.id, book, user?.id);
        
        if (mountedRef.current) {
          dispatch({ type: 'UPDATE_BOOK_SUCCESS', payload: updatedBook });
          dispatch({ type: 'UPDATE_OFFLINE_QUEUE', payload: OfflineManager.getOfflineStatus().queuedOperations });
        }
        return;
      }
      
      // Optimistic update
      const originalBook = state.books.find(b => b.id === book.id);
      if (mountedRef.current) {
        dispatch({ type: 'UPDATE_BOOK_SUCCESS', payload: book });
      }
      
      if (user && isOnline) {
        try {
          const supabaseBook = transformBookForSupabase(book);
          
          const { error } = await supabase
            .from('books')
            .update(supabaseBook)
            .eq('id', book.id)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (supabaseError) {
          // Revert optimistic update
          if (mountedRef.current && originalBook) {
            dispatch({ type: 'UPDATE_BOOK_SUCCESS', payload: originalBook });
          }
          throw supabaseError;
        }
      }
    } catch (error) {
      console.error('Error updating book:', error);
      if (mountedRef.current) {
        dispatch({ type: 'UPDATE_BOOK_ERROR', payload: error.message });
      }
      throw error;
    }
  }, [user, state.books]);

  const deleteBook = useCallback(async (id) => {
    if (!mountedRef.current) return;
    
    try {
      dispatch({ type: 'DELETE_BOOK_START' });
      
      const isOnline = await NetworkStatus.isOnline();
      
      if (!isOnline || OfflineManager.isOfflineModeEnabled) {
        console.log('OptimizedBookContext: Deleting book offline');
        await OfflineManager.deleteBookOffline(id, user?.id);
        
        if (mountedRef.current) {
          dispatch({ type: 'DELETE_BOOK_SUCCESS', payload: id });
          dispatch({ type: 'UPDATE_OFFLINE_QUEUE', payload: OfflineManager.getOfflineStatus().queuedOperations });
        }
        return;
      }
      
      // Store original book for potential revert
      const originalBook = state.books.find(book => book.id === id);
      
      // Optimistic update
      if (mountedRef.current) {
        dispatch({ type: 'DELETE_BOOK_SUCCESS', payload: id });
      }
      
      if (user && isOnline) {
        try {
          const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (supabaseError) {
          // Revert optimistic update
          if (mountedRef.current && originalBook) {
            dispatch({ type: 'ADD_BOOK_SUCCESS', payload: originalBook });
          }
          throw supabaseError;
        }
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      if (mountedRef.current) {
        dispatch({ type: 'DELETE_BOOK_ERROR', payload: error.message });
      }
      throw error;
    }
  }, [user, state.books]);

  const clearAllBooks = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      dispatch({ type: 'CLEAR_ALL_BOOKS_START' });
      
      // Store original books for potential revert
      const originalBooks = [...state.books];
      
      // Optimistic update
      if (mountedRef.current) {
        dispatch({ type: 'CLEAR_ALL_BOOKS_SUCCESS' });
      }
      
      if (user) {
        try {
          const { error } = await supabase
            .from('books')
            .delete()
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (supabaseError) {
          // Revert optimistic update
          if (mountedRef.current) {
            dispatch({ type: 'FETCH_BOOKS_SUCCESS', payload: originalBooks });
          }
          throw supabaseError;
        }
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.BOOKS);
    } catch (error) {
      console.error('Error clearing books:', error);
      if (mountedRef.current) {
        dispatch({ type: 'CLEAR_ALL_BOOKS_ERROR', payload: error.message });
      }
      throw error;
    }
  }, [user, state.books]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refetchBooks = useCallback(() => {
    if (user) {
      return loadBooksFromSupabase();
    } else {
      return loadBooksFromStorage();
    }
  }, [user, loadBooksFromSupabase, loadBooksFromStorage]);

  // Additional offline utility functions
  const forceSync = useCallback(async () => {
    try {
      await OfflineManager.forceSync();
      await refetchBooks(); // Reload books after sync
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }, [refetchBooks]);

  const checkAndSync = useCallback(async () => {
    try {
      await OfflineManager.checkAndSync();
      // Books will be reloaded via sync completion listener
    } catch (error) {
      console.error('Check and sync failed:', error);
      throw error;
    }
  }, []);

  const getOfflineStatus = useCallback(() => {
    return {
      isOffline: state.isOffline,
      queuedOperations: state.queuedOperations,
      ...OfflineManager.getOfflineStatus(),
    };
  }, [state.isOffline, state.queuedOperations]);

  // Memoize state context value
  const stateValue = useMemo(() => ({
    books: state.books,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    syncStatus: state.syncStatus,
    isOffline: state.isOffline,
    queuedOperations: state.queuedOperations,
  }), [state.books, state.loading, state.error, state.lastUpdated, state.syncStatus, state.isOffline, state.queuedOperations]);

  // Memoize actions context value
  const actionsValue = useMemo(() => ({
    addBook,
    updateBook,
    deleteBook,
    clearAllBooks,
    clearError,
    refetchBooks,
    forceSync,
    checkAndSync,
    getOfflineStatus,
  }), [addBook, updateBook, deleteBook, clearAllBooks, clearError, refetchBooks, forceSync, checkAndSync, getOfflineStatus]);

  // Show loading state while auth context is initializing
  if (!isAuthReady) {
    const loadingStateValue = {
      ...stateValue,
      loading: { ...stateValue.loading, fetch: true },
    };
    
    return (
      <BookStateContext.Provider value={loadingStateValue}>
        <BookActionsContext.Provider value={actionsValue}>
          {children}
        </BookActionsContext.Provider>
      </BookStateContext.Provider>
    );
  }

  return (
    <BookStateContext.Provider value={stateValue}>
      <BookActionsContext.Provider value={actionsValue}>
        {children}
      </BookActionsContext.Provider>
    </BookStateContext.Provider>
  );
};

// Custom hooks for consuming contexts
export const useBookState = () => {
  const context = useContext(BookStateContext);
  if (context === undefined) {
    throw new Error('useBookState must be used within an OptimizedBookProvider');
  }
  return context;
};

export const useBookActions = () => {
  const context = useContext(BookActionsContext);
  if (context === undefined) {
    throw new Error('useBookActions must be used within an OptimizedBookProvider');
  }
  return context;
};

// Combined hook for backwards compatibility
export const useBooks = () => {
  const state = useBookState();
  const actions = useBookActions();
  return { ...state, ...actions };
};

// Selector hooks for performance optimization
export const useBookSelector = (selector) => {
  const state = useBookState();
  return useMemo(() => selector(state), [state, selector]);
};

export const useBookById = (id) => {
  return useBookSelector((state) => 
    state.books.find(book => book.id === id)
  );
};

export const useBooksByStatus = (status) => {
  return useBookSelector((state) => 
    state.books.filter(book => book.status === status)
  );
};

export const useFilteredBooks = (searchQuery, statusFilter) => {
  return useBookSelector((state) => {
    let filtered = state.books;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(book => book.status === statusFilter);
    }
    
    return filtered;
  });
};

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export contexts for advanced usage
export { BookStateContext, BookActionsContext };