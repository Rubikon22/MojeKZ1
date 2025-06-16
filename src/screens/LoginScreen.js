import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Card,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { Formik } from 'formik';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  spacing, 
  responsiveFontSize, 
  getResponsivePadding, 
  isTablet,
  getFormInputHeight,
  getButtonHeight 
} from '../utils/responsive';
import { LoginSchema } from '../utils/validation';
import { ErrorHandler } from '../utils/errorHandler';


const LoginScreen = ({ navigation }) => {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleLogin = async (values) => {
    setLoading(true);
    
    const { error } = await signIn(values.email, values.password);
    
    if (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      showSnackbar(errorMessage);
    }
    
    setLoading(false);
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Zaloguj sie</Title>
            <Paragraph style={styles.subtitle}>
              Wprowadz swoje dane, aby kontynuowac
            </Paragraph>

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleLogin}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.form}>
                  <TextInput
                    label="Email"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    disabled={loading}
                  />
                  {touched.email && errors.email && (
                    <Paragraph style={styles.errorText}>
                      {errors.email}
                    </Paragraph>
                  )}

                  <TextInput
                    label="Haslo"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    error={touched.password && errors.password}
                    secureTextEntry
                    style={styles.input}
                    disabled={loading}
                  />
                  {touched.password && errors.password && (
                    <Paragraph style={styles.errorText}>
                      {errors.password}
                    </Paragraph>
                  )}

                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    style={styles.button}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      'Zaloguj sie'
                    )}
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('Register')}
                    style={styles.button}
                    disabled={loading}
                  >
                    Utworz nowe konto
                  </Button>
                </View>
              )}
            </Formik>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
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
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: padding,
    },
    card: {
      elevation: 4,
      backgroundColor: theme.colors.card,
      maxWidth: isTabletDevice ? 400 : '100%',
      alignSelf: 'center',
      width: '100%',
      paddingVertical: spacing.lg,
      paddingHorizontal: padding,
    },
    title: {
      textAlign: 'center',
      marginBottom: spacing.sm,
      fontSize: responsiveFontSize(24),
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: spacing.lg,
      color: theme.colors.textSecondary,
      fontSize: responsiveFontSize(14),
      lineHeight: responsiveFontSize(20),
    },
    form: {
      marginTop: spacing.md,
    },
    input: {
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.surface,
      height: getFormInputHeight(),
    },
    button: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      height: getButtonHeight(),
      justifyContent: 'center',
    },
    linkButton: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      height: getButtonHeight(),
      justifyContent: 'center',
    },
    errorText: {
      color: theme.colors.error,
      fontSize: responsiveFontSize(12),
      marginBottom: spacing.sm,
    },
  });
};

export default LoginScreen;