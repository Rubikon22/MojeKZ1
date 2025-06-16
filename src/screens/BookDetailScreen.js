import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Divider, IconButton, Dialog, Portal } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBookState, useBookActions } from '../context/OptimizedBookContext';
import StarRating from '../components/StarRating';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const BookDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;
  const { books } = useBookState();
  const { deleteBook } = useBookActions();
  const { theme } = useTheme();
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  const styles = createStyles(theme);

  // Find the book by id (with safety check)
  const book = (books || []).find(book => book.id === id);

  if (!book) {
    return (
      <View style={styles.container}>
        <Text>Ksiazka nie zostala znaleziona</Text>
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate('BookForm', { book, isEditing: true });
  };

  const handleDelete = () => {
    setConfirmDialogVisible(true);
  };

  const confirmDelete = () => {
    deleteBook(id);
    setConfirmDialogVisible(false);
    navigation.goBack();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.coverContainer}>
          {book.coverImage ? (
            <Image source={{ uri: book.coverImage }} style={styles.coverImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>Brak okladki</Text>
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Title style={styles.title}>{book.title}</Title>
          <Paragraph style={styles.author}>{book.author}</Paragraph>
          
          <View style={styles.ratingContainer}>
            <StarRating rating={book.rating} size={24} readonly />
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={styles.statusValue}>{book.status}</Text>
          </View>
          
          <Text style={styles.dateAdded}>Dodano: {formatDate(book.dateAdded)}</Text>
        </View>
      </View>
      
      <Divider style={styles.divider} />
      
      {book.description ? (
        <Card style={styles.descriptionCard}>
          <Card.Content>
            <Title>Opis</Title>
            <Paragraph>{book.description}</Paragraph>
          </Card.Content>
        </Card>
      ) : null}
      
      {book.notes ? (
        <Card style={styles.notesCard}>
          <Card.Content>
            <Title>Notatki</Title>
            <Paragraph>{book.notes}</Paragraph>
          </Card.Content>
        </Card>
      ) : null}
      
      <View style={styles.actionButtons}>
        <Button 
          mode="contained" 
          onPress={handleEdit} 
          style={styles.editButton}
          icon="pencil"
        >
          Edytuj
        </Button>
        <Button 
          mode="outlined" 
          onPress={handleDelete} 
          style={styles.deleteButton}
          icon="delete"
          color="#f44336"
        >
          Usun
        </Button>
      </View>
      
      <Portal>
        <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
          <Dialog.Title>Potwierdz usuniecie</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Czy na pewno chcesz usunac ksiazke "{book.title}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)}>Anuluj</Button>
            <Button onPress={confirmDelete} color="#f44336">Usun</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  coverContainer: {
    width: width * 0.3,
    aspectRatio: 2/3,
    marginRight: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.placeholder,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: theme.colors.placeholderText,
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  author: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: 4,
    color: theme.colors.text,
  },
  statusValue: {
    color: theme.colors.primary,
  },
  dateAdded: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  divider: {
    marginVertical: 16,
  },
  descriptionCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: theme.colors.card,
  },
  notesCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: theme.colors.card,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: theme.colors.primary,
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: theme.colors.error,
  },
});

export default BookDetailScreen;