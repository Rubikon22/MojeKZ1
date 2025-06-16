import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import StarRating from './StarRating';
import { useTheme } from '../context/ThemeContext';
import { getBookCoverSize, spacing, responsiveFontSize, getResponsivePadding } from '../utils/responsive';
import { BookPropType } from '../utils/propTypes';

const BookItem = ({ book, onPress }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.coverContainer}>
            {book.coverImage ? (
              <Image source={{ uri: book.coverImage }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderCover}>
                <Paragraph style={styles.placeholderText}>Brak okladki</Paragraph>
              </View>
            )}
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.topSection}>
              <Title numberOfLines={2} style={styles.title}>{book.title}</Title>
              <Paragraph numberOfLines={1} style={styles.author}>{book.author}</Paragraph>
            </View>
            
            <View style={styles.bottomSection}>
              <View style={styles.ratingContainer}>
                <StarRating rating={book.rating} size={16} readonly />
              </View>
              
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{book.status}</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const createStyles = (theme) => {
  const coverSize = getBookCoverSize();
  const padding = getResponsivePadding();
  
  return StyleSheet.create({
    card: {
      marginBottom: spacing.sm,
      elevation: 2,
      backgroundColor: theme.colors.card,
      marginHorizontal: spacing.xs,
    },
    cardContent: {
      flexDirection: 'row',
      padding: padding * 0.75,
      minHeight: coverSize.height + spacing.md,
    },
    coverContainer: {
      width: coverSize.width,
      height: coverSize.height,
      marginRight: spacing.sm,
      flexShrink: 0,
    },
    coverImage: {
      width: '100%',
      height: '100%',
      borderRadius: 4,
    },
    placeholderCover: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.placeholder,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xs,
    },
    placeholderText: {
      fontSize: responsiveFontSize(10),
      textAlign: 'center',
      color: theme.colors.placeholderText,
    },
    infoContainer: {
      flex: 1,
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      minWidth: 0, // Allows text truncation
    },
    topSection: {
      flex: 1,
      minHeight: 0, // Allows proper text wrapping
    },
    bottomSection: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginTop: spacing.xs,
    },
    title: {
      fontSize: responsiveFontSize(16),
      marginBottom: spacing.xs / 2,
      color: theme.colors.text,
      lineHeight: responsiveFontSize(20),
    },
    author: {
      fontSize: responsiveFontSize(14),
      color: theme.colors.textSecondary,
      marginBottom: spacing.xs,
      lineHeight: responsiveFontSize(18),
    },
    ratingContainer: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    statusContainer: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
      borderWidth: 1,
      borderRadius: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: responsiveFontSize(11),
      color: theme.colors.primary,
      fontWeight: '500',
    },
  });
};

BookItem.propTypes = {
  book: BookPropType.isRequired,
  onPress: PropTypes.func.isRequired,
};

export default BookItem;