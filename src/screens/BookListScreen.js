import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Searchbar, FAB, Chip, Menu, Divider, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useBookState, useBookActions, BOOK_STATUS } from '../context/OptimizedBookContext';
import BookItem from '../components/BookItem';
import OfflineIndicator from '../components/OfflineIndicator';
import { useTheme } from '../context/ThemeContext';
import { 
  spacing, 
  responsiveFontSize, 
  getResponsivePadding, 
  isTablet, 
  getGridColumns 
} from '../utils/responsive';

const BookListScreen = () => {
  const navigation = useNavigation();
  const { books, loading, isOffline, queuedOperations } = useBookState();
  const { forceSync } = useBookActions();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState('dateAdded');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter books based on search query and selected status
  const filteredBooks = (books || []).filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus ? book.status === selectedStatus : true;
    
    return matchesSearch && matchesStatus;
  });

  // Sort books based on selected criteria
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'title') {
      return sortOrder === 'asc' 
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    } else if (sortBy === 'author') {
      return sortOrder === 'asc' 
        ? a.author.localeCompare(b.author)
        : b.author.localeCompare(a.author);
    } else if (sortBy === 'rating') {
      return sortOrder === 'asc' 
        ? a.rating - b.rating
        : b.rating - a.rating;
    } else { // dateAdded
      return sortOrder === 'asc' 
        ? new Date(a.dateAdded) - new Date(b.dateAdded)
        : new Date(b.dateAdded) - new Date(a.dateAdded);
    }
  });

  const onChangeSearch = query => setSearchQuery(query);

  const handleStatusFilter = status => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleSortOption = (option) => {
    if (sortBy === option) {
      // Toggle sort order if same option is selected
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort option with default desc order
      setSortBy(option);
      setSortOrder('desc');
    }
    setSortMenuVisible(false);
  };

  const renderItem = ({ item }) => (
    <BookItem 
      book={item} 
      onPress={() => navigation.navigate('BookDetail', { id: item.id, title: item.title })}
    />
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      
      
      <Searchbar
        placeholder="Szukaj ksiazke lub autora"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filtersContainer}>
        <View style={styles.statusFilters}>
          <Chip 
            selected={selectedStatus === BOOK_STATUS.READ}
            onPress={() => handleStatusFilter(BOOK_STATUS.READ)}
            style={styles.filterChip}
          >
            {BOOK_STATUS.READ}
          </Chip>
          <Chip 
            selected={selectedStatus === BOOK_STATUS.READING}
            onPress={() => handleStatusFilter(BOOK_STATUS.READING)}
            style={styles.filterChip}
          >
            {BOOK_STATUS.READING}
          </Chip>
          <Chip 
            selected={selectedStatus === BOOK_STATUS.WANT_TO_READ}
            onPress={() => handleStatusFilter(BOOK_STATUS.WANT_TO_READ)}
            style={styles.filterChip}
          >
            {BOOK_STATUS.WANT_TO_READ}
          </Chip>
        </View>
        
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Chip 
              icon="sort" 
              onPress={() => setSortMenuVisible(true)}
              style={styles.sortChip}
            >
              Sortuj
            </Chip>
          }
        >
          <Menu.Item 
            onPress={() => handleSortOption('dateAdded')} 
            title={`Data ${sortBy === 'dateAdded' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`} 
          />
          <Menu.Item 
            onPress={() => handleSortOption('title')} 
            title={`Tytul ${sortBy === 'title' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`} 
          />
          <Menu.Item 
            onPress={() => handleSortOption('author')} 
            title={`Autor ${sortBy === 'author' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`} 
          />
          <Menu.Item 
            onPress={() => handleSortOption('rating')} 
            title={`Ocena ${sortBy === 'rating' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`} 
          />
        </Menu>
      </View>
      
      {sortedBooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {books.length === 0 
              ? 'Nie masz jeszcze zadnych ksiazek. Dodaj pierwsza!'
              : 'Brak ksiazek spelniajacych kryteria wyszukiwania.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedBooks}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('BookForm')}
      />
      
    </View>
  );
};

const createStyles = (theme) => {
  const padding = getResponsivePadding();
  const isTabletDevice = isTablet();
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchBar: {
      margin: padding,
      elevation: 2,
      backgroundColor: theme.colors.surface,
    },
    filtersContainer: {
      flexDirection: isTabletDevice ? 'row' : 'column',
      justifyContent: 'space-between',
      paddingHorizontal: padding,
      marginBottom: spacing.sm,
    },
    statusFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      flex: isTabletDevice ? 1 : 0,
      marginBottom: isTabletDevice ? 0 : spacing.xs,
    },
    filterChip: {
      marginRight: spacing.xs,
      marginBottom: spacing.xs,
    },
    sortChip: {
      marginLeft: isTabletDevice ? spacing.xs : 0,
      alignSelf: isTabletDevice ? 'flex-end' : 'flex-start',
    },
    listContent: {
      padding: spacing.xs,
      paddingBottom: 80,
    },
    fab: {
      position: 'absolute',
      margin: spacing.md,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: responsiveFontSize(16),
      textAlign: 'center',
      color: theme.colors.textSecondary,
      lineHeight: responsiveFontSize(24),
    },
  });
};

export default BookListScreen;