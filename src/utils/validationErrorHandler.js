import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HelperText, Chip } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

/**
 * Enhanced Validation Error Handler
 * Provides comprehensive validation error display and management
 */
export class ValidationErrorHandler {
  static errorMessages = new Map();
  static fieldValidators = new Map();
  static customErrorHandlers = new Map();

  // Error severity levels
  static SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
  };

  // Error types
  static ERROR_TYPES = {
    REQUIRED: 'required',
    FORMAT: 'format',
    LENGTH: 'length',
    RANGE: 'range',
    CUSTOM: 'custom',
    ASYNC: 'async',
  };

  /**
   * Enhanced error messages in Polish
   */
  static defaultErrorMessages = {
    // Required field errors
    'required': 'To pole jest wymagane',
    'required.email': 'Adres e-mail jest wymagany',
    'required.password': 'Hasło jest wymagane',
    'required.title': 'Tytuł jest wymagany',
    'required.author': 'Autor jest wymagany',
    
    // Format errors
    'email.invalid': 'Podaj prawidłowy adres e-mail',
    'email.format': 'Format e-mail: example@domain.com',
    'password.weak': 'Hasło musi zawierać minimum 8 znaków, wielką literę, cyfrę i znak specjalny',
    'url.invalid': 'Podaj prawidłowy adres URL',
    'phone.invalid': 'Podaj prawidłowy numer telefonu',
    
    // Length errors
    'string.min': 'Minimum {min} znaków',
    'string.max': 'Maksimum {max} znaków',
    'string.length': 'Dokładnie {length} znaków',
    'title.short': 'Tytuł musi mieć co najmniej 2 znaki',
    'title.long': 'Tytuł nie może być dłuższy niż 100 znaków',
    'description.long': 'Opis nie może być dłuższy niż 500 znaków',
    
    // Range errors
    'number.min': 'Minimalna wartość: {min}',
    'number.max': 'Maksymalna wartość: {max}',
    'rating.range': 'Ocena musi być od 1 do 5',
    'date.future': 'Data nie może być w przyszłości',
    'date.past': 'Data nie może być w przeszłości',
    
    // Custom validation errors
    'password.mismatch': 'Hasła nie są identyczne',
    'username.taken': 'Ta nazwa użytkownika jest już zajęta',
    'email.taken': 'Ten adres e-mail jest już używany',
    'isbn.invalid': 'Nieprawidłowy numer ISBN',
    'isbn.exists': 'Książka z tym ISBN już istnieje',
    
    // File validation errors
    'file.size': 'Plik jest za duży (max {maxSize}MB)',
    'file.type': 'Nieprawidłowy typ pliku. Dozwolone: {allowedTypes}',
    'image.dimensions': 'Nieprawidłowe wymiary obrazu',
    'image.format': 'Obsługiwane formaty: JPG, PNG, WEBP',
    
    // Network/API errors
    'network.error': 'Błąd połączenia. Sprawdź internet.',
    'server.error': 'Błąd serwera. Spróbuj ponownie.',
    'validation.server': 'Serwer odrzucił dane. Sprawdź poprawność.',
  };

  /**
   * Initialize validation error handler
   */
  static initialize(customMessages = {}) {
    // Merge custom messages with defaults
    Object.entries(customMessages).forEach(([key, value]) => {
      this.errorMessages.set(key, value);
    });

    // Set default messages
    Object.entries(this.defaultErrorMessages).forEach(([key, value]) => {
      if (!this.errorMessages.has(key)) {
        this.errorMessages.set(key, value);
      }
    });
  }

  /**
   * Get error message with interpolation
   */
  static getMessage(errorKey, params = {}) {
    let message = this.errorMessages.get(errorKey) || errorKey;
    
    // Interpolate parameters
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
    
    return message;
  }

  /**
   * Validate field with multiple rules
   */
  static validateField(value, rules, fieldName) {
    const errors = [];
    
    for (const rule of rules) {
      const error = this.applyRule(value, rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }
    
    return errors;
  }

  /**
   * Apply single validation rule
   */
  static applyRule(value, rule, fieldName) {
    const { type, params = {}, message } = rule;
    
    switch (type) {
      case this.ERROR_TYPES.REQUIRED:
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return {
            type,
            message: message || this.getMessage(`required.${fieldName}`) || this.getMessage('required'),
            severity: this.SEVERITY.ERROR,
          };
        }
        break;
        
      case this.ERROR_TYPES.FORMAT:
        if (value && !this.validateFormat(value, params.pattern, params.format)) {
          return {
            type,
            message: message || this.getMessage(`${params.format}.invalid`),
            severity: this.SEVERITY.ERROR,
          };
        }
        break;
        
      case this.ERROR_TYPES.LENGTH:
        const lengthError = this.validateLength(value, params);
        if (lengthError) {
          return {
            type,
            message: message || lengthError,
            severity: this.SEVERITY.ERROR,
          };
        }
        break;
        
      case this.ERROR_TYPES.RANGE:
        const rangeError = this.validateRange(value, params);
        if (rangeError) {
          return {
            type,
            message: message || rangeError,
            severity: this.SEVERITY.ERROR,
          };
        }
        break;
        
      case this.ERROR_TYPES.CUSTOM:
        if (params.validator && !params.validator(value)) {
          return {
            type,
            message: message || this.getMessage(params.errorKey || 'custom'),
            severity: params.severity || this.SEVERITY.ERROR,
          };
        }
        break;
    }
    
    return null;
  }

  /**
   * Validate format (email, URL, etc.)
   */
  static validateFormat(value, pattern, format) {
    if (!value) return true;
    
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      phone: /^[+]?[\d\s\-\(\)]+$/,
      isbn: /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
    };
    
    const regex = pattern ? new RegExp(pattern) : patterns[format];
    return regex ? regex.test(value) : true;
  }

  /**
   * Validate length constraints
   */
  static validateLength(value, params) {
    if (!value) return null;
    
    const length = typeof value === 'string' ? value.length : String(value).length;
    
    if (params.min && length < params.min) {
      return this.getMessage('string.min', params);
    }
    
    if (params.max && length > params.max) {
      return this.getMessage('string.max', params);
    }
    
    if (params.exact && length !== params.exact) {
      return this.getMessage('string.length', { length: params.exact });
    }
    
    return null;
  }

  /**
   * Validate range constraints
   */
  static validateRange(value, params) {
    if (!value) return null;
    
    const numValue = Number(value);
    if (isNaN(numValue)) return null;
    
    if (params.min && numValue < params.min) {
      return this.getMessage('number.min', params);
    }
    
    if (params.max && numValue > params.max) {
      return this.getMessage('number.max', params);
    }
    
    return null;
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password) {
    if (!password) return null;
    
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    if (passedChecks < 3) {
      return {
        type: this.ERROR_TYPES.CUSTOM,
        message: this.getMessage('password.weak'),
        severity: this.SEVERITY.ERROR,
        details: checks,
      };
    }
    
    if (passedChecks < 4) {
      return {
        type: this.ERROR_TYPES.CUSTOM,
        message: 'Hasło mogłoby być silniejsze',
        severity: this.SEVERITY.WARNING,
        details: checks,
      };
    }
    
    return null;
  }

  /**
   * Async validation for server-side checks
   */
  static async validateAsync(value, asyncValidator, fieldName) {
    try {
      const isValid = await asyncValidator(value);
      if (!isValid) {
        return {
          type: this.ERROR_TYPES.ASYNC,
          message: this.getMessage(`${fieldName}.taken`) || 'Wartość jest niedostępna',
          severity: this.SEVERITY.ERROR,
        };
      }
      return null;
    } catch (error) {
      return {
        type: this.ERROR_TYPES.ASYNC,
        message: this.getMessage('network.error'),
        severity: this.SEVERITY.WARNING,
      };
    }
  }

  /**
   * Validate form data
   */
  static validateForm(formData, validationSchema) {
    const errors = {};
    
    Object.entries(validationSchema).forEach(([fieldName, rules]) => {
      const fieldValue = formData[fieldName];
      const fieldErrors = this.validateField(fieldValue, rules, fieldName);
      
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    });
    
    return errors;
  }

  /**
   * Register custom validator
   */
  static registerValidator(name, validator) {
    this.fieldValidators.set(name, validator);
  }

  /**
   * Register custom error handler
   */
  static registerErrorHandler(errorType, handler) {
    this.customErrorHandlers.set(errorType, handler);
  }
}

/**
 * React component for displaying validation errors
 */
export const ValidationErrorDisplay = ({ 
  errors = [], 
  field, 
  showSeverity = true,
  maxErrors = 3,
}) => {
  const { theme } = useTheme();
  
  if (!errors || errors.length === 0) {
    return null;
  }

  const displayErrors = errors.slice(0, maxErrors);
  const hasMoreErrors = errors.length > maxErrors;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case ValidationErrorHandler.SEVERITY.CRITICAL:
        return theme.colors.error;
      case ValidationErrorHandler.SEVERITY.ERROR:
        return theme.colors.error;
      case ValidationErrorHandler.SEVERITY.WARNING:
        return '#ff9800';
      case ValidationErrorHandler.SEVERITY.INFO:
        return theme.colors.primary;
      default:
        return theme.colors.error;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case ValidationErrorHandler.SEVERITY.CRITICAL:
        return '🚨';
      case ValidationErrorHandler.SEVERITY.ERROR:
        return '❌';
      case ValidationErrorHandler.SEVERITY.WARNING:
        return '⚠️';
      case ValidationErrorHandler.SEVERITY.INFO:
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  return (
    <View style={styles.errorContainer}>
      {displayErrors.map((error, index) => (
        <HelperText
          key={index}
          type="error"
          visible={true}
          style={[
            styles.errorText,
            { color: getSeverityColor(error.severity) }
          ]}
        >
          {showSeverity && `${getSeverityIcon(error.severity)} `}
          {error.message}
        </HelperText>
      ))}
      
      {hasMoreErrors && (
        <HelperText
          type="info"
          visible={true}
          style={styles.moreErrorsText}
        >
          +{errors.length - maxErrors} więcej błędów
        </HelperText>
      )}
    </View>
  );
};

/**
 * Real-time validation component
 */
export const RealTimeValidator = ({ 
  value, 
  rules, 
  fieldName, 
  children,
  debounceMs = 300,
  onValidationChange,
}) => {
  const [errors, setErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const validateField = async () => {
      setIsValidating(true);
      
      try {
        const validationErrors = ValidationErrorHandler.validateField(value, rules, fieldName);
        setErrors(validationErrors);
        onValidationChange?.(validationErrors);
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateField, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [value, rules, fieldName, debounceMs, onValidationChange]);

  return (
    <View>
      {children}
      <ValidationErrorDisplay errors={errors} field={fieldName} />
      {isValidating && (
        <HelperText type="info" visible={true}>
          Sprawdzanie...
        </HelperText>
      )}
    </View>
  );
};

/**
 * Password strength indicator
 */
export const PasswordStrengthIndicator = ({ password, showDetails = true }) => {
  const { theme } = useTheme();
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    const strengthResult = ValidationErrorHandler.validatePasswordStrength(password);
    setStrength(strengthResult);
  }, [password]);

  if (!password) return null;

  const getStrengthLevel = () => {
    if (!strength?.details) return 0;
    
    const passedChecks = Object.values(strength.details).filter(Boolean).length;
    return Math.min(passedChecks, 5);
  };

  const getStrengthColor = (level) => {
    const colors = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2e7d32'];
    return colors[level - 1] || colors[0];
  };

  const getStrengthLabel = (level) => {
    const labels = ['Bardzo słabe', 'Słabe', 'Średnie', 'Silne', 'Bardzo silne'];
    return labels[level - 1] || 'Bardzo słabe';
  };

  const strengthLevel = getStrengthLevel();
  const strengthColor = getStrengthColor(strengthLevel);

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthHeader}>
        <Text style={[styles.strengthLabel, { color: theme.colors.textSecondary }]}>
          Siła hasła:
        </Text>
        <Text style={[styles.strengthValue, { color: strengthColor }]}>
          {getStrengthLabel(strengthLevel)}
        </Text>
      </View>
      
      <View style={styles.strengthBar}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.strengthSegment,
              {
                backgroundColor: level <= strengthLevel
                  ? strengthColor
                  : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {showDetails && strength?.details && (
        <View style={styles.strengthDetails}>
          {Object.entries(strength.details).map(([check, passed]) => (
            <Chip
              key={check}
              icon={passed ? "check" : "close"}
              style={[
                styles.strengthChip,
                {
                  backgroundColor: passed
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)',
                },
              ]}
              textStyle={{
                color: passed ? '#4caf50' : '#f44336',
                fontSize: 11,
              }}
            >
              {getCheckLabel(check)}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
};

const getCheckLabel = (check) => {
  const labels = {
    length: '8+ znaków',
    uppercase: 'Wielka litera',
    lowercase: 'Mała litera',
    number: 'Cyfra',
    special: 'Znak specjalny',
  };
  return labels[check] || check;
};

/**
 * React hook for form validation
 */
export const useFormValidation = (initialValues, validationSchema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const validateForm = async () => {
    setIsValidating(true);
    try {
      const formErrors = ValidationErrorHandler.validateForm(values, validationSchema);
      setErrors(formErrors);
      return Object.keys(formErrors).length === 0;
    } finally {
      setIsValidating(false);
    }
  };

  const validateField = async (fieldName) => {
    const rules = validationSchema[fieldName];
    if (!rules) return true;

    const fieldErrors = ValidationErrorHandler.validateField(values[fieldName], rules, fieldName);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: fieldErrors,
    }));

    return fieldErrors.length === 0;
  };

  const setValue = (fieldName, value) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Validate field if it's been touched
    if (touched[fieldName]) {
      validateField(fieldName);
    }
  };

  const setFieldTouched = (fieldName, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: isTouched,
    }));

    if (isTouched) {
      validateField(fieldName);
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isValidating,
    setValue,
    setFieldTouched,
    validateForm,
    validateField,
    resetForm,
    isValid: Object.keys(errors).length === 0,
  };
};

const styles = StyleSheet.create({
  errorContainer: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 2,
  },
  moreErrorsText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  strengthLabel: {
    fontSize: 12,
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  strengthBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    marginRight: 1,
  },
  strengthDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  strengthChip: {
    height: 24,
  },
});

// Initialize with default messages
ValidationErrorHandler.initialize();

export default ValidationErrorHandler;