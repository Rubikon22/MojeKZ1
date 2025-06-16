import {
  LoginSchema,
  RegisterSchema,
  BookSchema,
  validateEmail,
  getErrorMessage,
} from '../../src/utils/validation';
import { ERROR_MESSAGES } from '../../src/constants';

describe('Validation Utilities', () => {
  describe('LoginSchema', () => {
    it('should validate correct login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(LoginSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(LoginSchema.validate(invalidData)).rejects.toThrow('Nieprawidlowy adres email');
    });

    it('should reject short password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };

      await expect(LoginSchema.validate(invalidData)).rejects.toThrow('co najmniej 6 znakow');
    });

    it('should reject missing email', async () => {
      const invalidData = {
        password: 'password123',
      };

      await expect(LoginSchema.validate(invalidData)).rejects.toThrow('Email jest wymagany');
    });

    it('should reject missing password', async () => {
      const invalidData = {
        email: 'test@example.com',
      };

      await expect(LoginSchema.validate(invalidData)).rejects.toThrow('Haslo jest wymagane');
    });
  });

  describe('RegisterSchema', () => {
    it('should validate correct registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      await expect(RegisterSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject mismatched passwords', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      };

      await expect(RegisterSchema.validate(invalidData)).rejects.toThrow('identyczne');
    });

    it('should reject missing confirm password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(RegisterSchema.validate(invalidData)).rejects.toThrow('Potwierdzenie hasla jest wymagane');
    });
  });

  describe('BookSchema', () => {
    it('should validate correct book data', async () => {
      const validData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test description',
        notes: 'Test notes',
        status: 'Przeczytana',
        rating: 4,
      };

      await expect(BookSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should validate minimal book data', async () => {
      const minimalData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'Przeczytana',
        rating: 0,
      };

      await expect(BookSchema.validate(minimalData)).resolves.toEqual({
        ...minimalData,
        description: undefined,
        notes: undefined,
      });
    });

    it('should reject missing title', async () => {
      const invalidData = {
        author: 'Test Author',
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('Tytul jest wymagany');
    });

    it('should reject missing author', async () => {
      const invalidData = {
        title: 'Test Book',
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('Autor jest wymagany');
    });

    it('should reject missing status', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('Status jest wymagany');
    });

    it('should reject too long title', async () => {
      const invalidData = {
        title: 'A'.repeat(101), // Exceeds MAX_TITLE_LENGTH (100)
        author: 'Test Author',
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('dluzszy niz 100');
    });

    it('should reject too long author', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'A'.repeat(101), // Exceeds MAX_AUTHOR_LENGTH (100)
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('dluzszy niz 100');
    });

    it('should reject too long description', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'A'.repeat(1001), // Exceeds MAX_DESCRIPTION_LENGTH (1000)
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('dluzszy niz 1000');
    });

    it('should reject too long notes', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        notes: 'A'.repeat(501), // Exceeds MAX_NOTES_LENGTH (500)
        status: 'Przeczytana',
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow('dluzsze niz 500');
    });

    it('should reject invalid rating (too high)', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'Przeczytana',
        rating: 6, // Max is 5
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject invalid rating (negative)', async () => {
      const invalidData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'Przeczytana',
        rating: -1, // Min is 0
      };

      await expect(BookSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user+tag@domain.co.uk',
        'name.surname@company.org',
        'email123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('getErrorMessage', () => {
    it('should return string errors as-is', () => {
      const errorMessage = 'Simple error message';
      expect(getErrorMessage(errorMessage)).toBe(errorMessage);
    });

    it('should extract message from error objects', () => {
      const error = new Error('Error object message');
      expect(getErrorMessage(error)).toBe('Error object message');
    });

    it('should handle duplicate key errors', () => {
      const error = { message: 'duplicate key value violates unique constraint' };
      expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.DUPLICATE);
    });

    it('should handle not null violation errors', () => {
      const error = { message: 'not null violation - column cannot be null' };
      expect(getErrorMessage(error)).toBe(ERROR_MESSAGES.VALIDATION);
    });

    it('should handle network errors', () => {
      const networkError = { message: 'network request failed' };
      expect(getErrorMessage(networkError)).toBe(ERROR_MESSAGES.NETWORK);
    });

    it('should return generic error for unknown errors', () => {
      const unknownError = {};
      expect(getErrorMessage(unknownError)).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle null/undefined errors', () => {
      expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.GENERIC);
      expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.GENERIC);
    });

    it('should handle errors without message property', () => {
      const errorWithoutMessage = { code: 500, status: 'error' };
      expect(getErrorMessage(errorWithoutMessage)).toBe(ERROR_MESSAGES.GENERIC);
    });
  });
});