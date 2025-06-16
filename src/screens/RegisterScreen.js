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
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';

const RegisterSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'Imie musi miec co najmniej 2 znaki')
    .required('Imie jest wymagane'),
  lastName: Yup.string()
    .min(2, 'Nazwisko musi miec co najmniej 2 znaki')
    .required('Nazwisko jest wymagane'),
  email: Yup.string()
    .email('Nieprawidlowy adres email')
    .required('Email jest wymagany'),
  password: Yup.string()
    .min(6, 'Haslo musi miec co najmniej 6 znakow')
    .required('Haslo jest wymagane'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Hasla musza byc identyczne')
    .required('Potwierdzenie hasla jest wymagane'),
});

const RegisterScreen = ({ navigation }) => {
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleRegister = async (values) => {
    setLoading(true);
    const { error } = await signUp(values.email, values.password, {
      first_name: values.firstName,
      last_name: values.lastName,
    });
    
    if (error) {
      showSnackbar(typeof error === 'string' ? error : error.message || 'Blad rejestracji');
    } else {
      showSnackbar('Konto zostalo utworzone! Sprawdz email w celu weryfikacji.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Utworz konto</Title>
            <Paragraph style={styles.subtitle}>
              Wypelnij formularz, aby zalozyc nowe konto
            </Paragraph>

            <Formik
              initialValues={{
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                confirmPassword: '',
              }}
              validationSchema={RegisterSchema}
              onSubmit={handleRegister}
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
                    label="Imie"
                    value={values.firstName}
                    onChangeText={handleChange('firstName')}
                    onBlur={handleBlur('firstName')}
                    error={touched.firstName && errors.firstName}
                    style={styles.input}
                    disabled={loading}
                  />
                  {touched.firstName && errors.firstName && (
                    <Paragraph style={styles.errorText}>
                      {errors.firstName}
                    </Paragraph>
                  )}

                  <TextInput
                    label="Nazwisko"
                    value={values.lastName}
                    onChangeText={handleChange('lastName')}
                    onBlur={handleBlur('lastName')}
                    error={touched.lastName && errors.lastName}
                    style={styles.input}
                    disabled={loading}
                  />
                  {touched.lastName && errors.lastName && (
                    <Paragraph style={styles.errorText}>
                      {errors.lastName}
                    </Paragraph>
                  )}

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

                  <TextInput
                    label="Potwierdz haslo"
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    error={touched.confirmPassword && errors.confirmPassword}
                    secureTextEntry
                    style={styles.input}
                    disabled={loading}
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <Paragraph style={styles.errorText}>
                      {errors.confirmPassword}
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
                      'Utworz konto'
                    )}
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('Login')}
                    style={styles.button}
                    disabled={loading}
                  >
                    Masz juz konto? Zaloguj sie
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  form: {
    marginTop: 16,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default RegisterScreen;