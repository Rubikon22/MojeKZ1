import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, RadioButton, Title, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Formik } from 'formik';
import { useBookActions, BOOK_STATUS } from '../context/OptimizedBookContext';
import { BookSchema } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';
import { APP_CONFIG, SUCCESS_MESSAGES } from '../constants';
import StarRating from '../components/StarRating';
import { useTheme } from '../context/ThemeContext';
import { 
  spacing, 
  responsiveFontSize, 
  getResponsivePadding, 
  isTablet,
  moderateScale,
  getFormInputHeight,
  getButtonHeight 
} from '../utils/responsive';


const BookFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { addBook, updateBook } = useBookActions();
  const { theme } = useTheme();
  
  // Check if we're editing an existing book
  const isEditing = route.params?.isEditing || false;
  const existingBook = route.params?.book;
  
  // Initial form values
  const initialValues = isEditing
    ? { ...existingBook }
    : {
        title: '',
        author: '',
        description: '',
        notes: '',
        status: BOOK_STATUS.WANT_TO_READ,
        rating: 0,
        coverImage: null,
      };

  // Request camera permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Brak uprawnien', 'Potrzebujemy uprawnien do galerii, aby dodac zdjecie okladki.');
        }
      }
    })();
  }, []);

  const pickImage = async (setFieldValue) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: APP_CONFIG.ASPECT_RATIO,
      quality: APP_CONFIG.IMAGE_QUALITY,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      setFieldValue('coverImage', result.assets[0].uri);
    }
  };

  const takePhoto = async (setFieldValue) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Brak uprawnien', 'Potrzebujemy uprawnien do kamery, aby zrobic zdjecie okladki.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: APP_CONFIG.ASPECT_RATIO,
      quality: APP_CONFIG.IMAGE_QUALITY,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      setFieldValue('coverImage', result.assets[0].uri);
    }
  };

  const handleSubmit = async (values) => {
    await ErrorHandler.handleAsync(
      async () => {
        if (isEditing) {
          await updateBook(values);
          ErrorHandler.showSuccess(SUCCESS_MESSAGES.BOOK_UPDATED, 'Sukces', () => navigation.goBack());
        } else {
          await addBook(values);
          ErrorHandler.showSuccess(SUCCESS_MESSAGES.BOOK_ADDED, 'Sukces', () => navigation.goBack());
        }
      },
      'BookFormScreen.handleSubmit'
    );
  };

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <Formik
        initialValues={initialValues}
        validationSchema={BookSchema}
        onSubmit={handleSubmit}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
          <View style={styles.formContainer}>
            <TouchableOpacity 
              style={styles.coverContainer} 
              onPress={() => {
                Alert.alert(
                  'Wybierz zrodlo zdjecia',
                  'Skad chcesz dodac zdjecie okladki?',
                  [
                    { text: 'Anuluj', style: 'cancel' },
                    { text: 'Galeria', onPress: () => pickImage(setFieldValue) },
                    { text: 'Aparat', onPress: () => takePhoto(setFieldValue) },
                  ]
                );
              }}
            >
              {values.coverImage ? (
                <Image source={{ uri: values.coverImage }} style={styles.coverImage} resizeMode="contain" />
              ) : (
                <View style={styles.placeholderCover}>
                  <Text style={styles.placeholderText}>Dotknij, aby dodac okladke</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TextInput
              label="Tytul *"
              value={values.title}
              onChangeText={handleChange('title')}
              onBlur={handleBlur('title')}
              style={styles.input}
              error={touched.title && errors.title}
            />
            {touched.title && errors.title && (
              <HelperText type="error">{errors.title}</HelperText>
            )}
            
            <TextInput
              label="Autor *"
              value={values.author}
              onChangeText={handleChange('author')}
              onBlur={handleBlur('author')}
              style={styles.input}
              error={touched.author && errors.author}
            />
            {touched.author && errors.author && (
              <HelperText type="error">{errors.author}</HelperText>
            )}
            
            <TextInput
              label="Opis"
              value={values.description}
              onChangeText={handleChange('description')}
              onBlur={handleBlur('description')}
              style={styles.input}
              multiline
              numberOfLines={4}
            />
            
            <Title style={styles.sectionTitle}>Status *</Title>
            <RadioButton.Group
              onValueChange={value => setFieldValue('status', value)}
              value={values.status}
            >
              <View style={styles.radioOption}>
                <RadioButton value={BOOK_STATUS.READ} />
                <Text style={styles.radioText}>{BOOK_STATUS.READ}</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value={BOOK_STATUS.READING} />
                <Text style={styles.radioText}>{BOOK_STATUS.READING}</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value={BOOK_STATUS.WANT_TO_READ} />
                <Text style={styles.radioText}>{BOOK_STATUS.WANT_TO_READ}</Text>
              </View>
            </RadioButton.Group>
            
            <Title style={styles.sectionTitle}>Ocena</Title>
            <View style={styles.ratingContainer}>
              <StarRating 
                rating={values.rating} 
                onRatingChange={(rating) => setFieldValue('rating', rating)} 
                size={32} 
              />
            </View>
            
            <TextInput
              label="Notatki"
              value={values.notes}
              onChangeText={handleChange('notes')}
              onBlur={handleBlur('notes')}
              style={styles.input}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                onPress={handleSubmit} 
                style={styles.submitButton}
              >
                {isEditing ? 'Zapisz zmiany' : 'Dodaj ksiazke'}
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => navigation.goBack()} 
                style={styles.cancelButton}
              >
                Anuluj
              </Button>
            </View>
          </View>
        )}
      </Formik>
    </ScrollView>
  );
};

const createStyles = (theme) => {
  const padding = getResponsivePadding();
  const isTabletDevice = isTablet();
  const coverWidth = isTabletDevice ? moderateScale(180) : moderateScale(150);
  const coverHeight = coverWidth * 1.5;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    formContainer: {
      padding: padding,
      maxWidth: isTabletDevice ? 600 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    coverContainer: {
      alignSelf: 'center',
      width: coverWidth,
      height: coverHeight,
      marginBottom: spacing.lg,
      borderRadius: 8,
      overflow: 'hidden',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    placeholderCover: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.placeholder,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.sm,
    },
    placeholderText: {
      color: theme.colors.placeholderText,
      textAlign: 'center',
      fontSize: responsiveFontSize(14),
    },
    input: {
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.surface,
      height: getFormInputHeight(),
    },
    sectionTitle: {
      fontSize: responsiveFontSize(16),
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      color: theme.colors.text,
      fontWeight: '600',
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.xs / 2,
      paddingVertical: spacing.xs,
    },
    radioText: {
      color: theme.colors.text,
      marginLeft: spacing.sm,
      fontSize: responsiveFontSize(14),
    },
    ratingContainer: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      justifyContent: 'flex-start',
    },
    buttonContainer: {
      marginTop: spacing.lg,
      marginBottom: spacing.xxl,
      flexDirection: isTabletDevice ? 'row' : 'column',
      justifyContent: isTabletDevice ? 'space-between' : 'stretch',
    },
    submitButton: {
      marginBottom: isTabletDevice ? 0 : spacing.sm,
      backgroundColor: theme.colors.primary,
      height: getButtonHeight(),
      justifyContent: 'center',
      flex: isTabletDevice ? 1 : 0,
      marginRight: isTabletDevice ? spacing.sm : 0,
    },
    cancelButton: {
      borderColor: theme.colors.primary,
      height: getButtonHeight(),
      justifyContent: 'center',
      flex: isTabletDevice ? 1 : 0,
    },
  });
};

export default BookFormScreen;