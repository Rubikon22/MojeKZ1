import * as Yup from 'yup';
import { VALIDATION, ERROR_MESSAGES } from '../constants';

// Common validation schemas
export const emailValidation = Yup.string()
  .email('Nieprawidlowy adres email')
  .required('Email jest wymagany');

export const passwordValidation = Yup.string()
  .min(VALIDATION.MIN_PASSWORD_LENGTH, `Haslo musi miec co najmniej ${VALIDATION.MIN_PASSWORD_LENGTH} znakow`)
  .required('Haslo jest wymagane');

// Auth schemas
export const LoginSchema = Yup.object().shape({
  email: emailValidation,
  password: passwordValidation,
});

export const RegisterSchema = Yup.object().shape({
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Hasla musza byc identyczne')
    .required('Potwierdzenie hasla jest wymagane'),
});

// Book schema
export const BookSchema = Yup.object().shape({
  title: Yup.string()
    .max(VALIDATION.MAX_TITLE_LENGTH, `Tytul nie moze byc dluzszy niz ${VALIDATION.MAX_TITLE_LENGTH} znakow`)
    .required('Tytul jest wymagany'),
  author: Yup.string()
    .max(VALIDATION.MAX_AUTHOR_LENGTH, `Autor nie moze byc dluzszy niz ${VALIDATION.MAX_AUTHOR_LENGTH} znakow`)
    .required('Autor jest wymagany'),
  description: Yup.string()
    .max(VALIDATION.MAX_DESCRIPTION_LENGTH, `Opis nie moze byc dluzszy niz ${VALIDATION.MAX_DESCRIPTION_LENGTH} znakow`),
  notes: Yup.string()
    .max(VALIDATION.MAX_NOTES_LENGTH, `Notatki nie moga byc dluzsze niz ${VALIDATION.MAX_NOTES_LENGTH} znakow`),
  status: Yup.string().required('Status jest wymagany'),
  rating: Yup.number().min(0).max(5),
});

// Utility functions
export const validateEmail = (email) => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) {
    if (error.message.includes('duplicate key value')) {
      return ERROR_MESSAGES.DUPLICATE;
    } else if (error.message.includes('not null violation')) {
      return ERROR_MESSAGES.VALIDATION;
    } else if (error.message.includes('network')) {
      return ERROR_MESSAGES.NETWORK;
    }
    return error.message;
  }
  return ERROR_MESSAGES.GENERIC;
};