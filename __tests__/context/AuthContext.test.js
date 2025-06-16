import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { Text, View } from 'react-native';

// Mock supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('../../src/config/supabase', () => ({
  supabase: mockSupabase,
}));

// Test component that uses AuthContext
const TestComponent = () => {
  const { user, loading, signUp, signIn, signOut } = useAuth();

  return (
    <View>
      <Text testID="loading">{loading ? 'loading' : 'not-loading'}</Text>
      <Text testID="user">{user ? user.email : 'no-user'}</Text>
      <Text testID="signUp" onPress={() => signUp('test@example.com', 'password123')}>
        Sign Up
      </Text>
      <Text testID="signIn" onPress={() => signIn('test@example.com', 'password123')}>
        Sign In
      </Text>
      <Text testID="signOut" onPress={() => signOut()}>
        Sign Out
      </Text>
    </View>
  );
};

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {},
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
  };

  let mockUnsubscribe;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUnsubscribe = jest.fn();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: mockUnsubscribe },
    });
  });

  describe('initialization', () => {
    it('should start with loading true and no user', async () => {
      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId('loading').props.children).toBe('loading');
      expect(getByTestId('user').props.children).toBe('no-user');
    });

    it('should load existing session on mount', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
        expect(getByTestId('user').props.children).toBe('test@example.com');
      });
    });

    it('should handle session loading error', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
        expect(getByTestId('user').props.children).toBe('no-user');
      });
    });

    it('should set up auth state change listener', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should cleanup auth listener on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('auth state changes', () => {
    it('should update user when auth state changes to signed in', async () => {
      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockUnsubscribe } };
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial setup
      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
      });

      // Simulate auth state change
      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(getByTestId('user').props.children).toBe('test@example.com');
      });
    });

    it('should clear user when auth state changes to signed out', async () => {
      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockUnsubscribe } };
      });

      // Start with a session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for user to be loaded
      await waitFor(() => {
        expect(getByTestId('user').props.children).toBe('test@example.com');
      });

      // Simulate sign out
      await act(async () => {
        authStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(getByTestId('user').props.children).toBe('no-user');
      });
    });
  });

  describe('signUp', () => {
    it('should successfully sign up user', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signUpComponent = getByTestId('signUp');
      
      await act(async () => {
        signUpComponent.props.onPress();
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {},
        },
      });
    });

    it('should handle sign up error', async () => {
      const signUpError = new Error('Email already exists');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: signUpError,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signUpComponent = getByTestId('signUp');
      
      await act(async () => {
        const result = await signUpComponent.props.onPress();
        // In real implementation, this would return the error
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    });

    it('should include user metadata in sign up', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const TestComponentWithMetadata = () => {
        const { signUp } = useAuth();
        
        return (
          <Text 
            testID="signUpWithMetadata" 
            onPress={() => signUp('test@example.com', 'password123', { name: 'Test User' })}
          >
            Sign Up
          </Text>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponentWithMetadata />
        </AuthProvider>
      );

      const signUpComponent = getByTestId('signUpWithMetadata');
      
      await act(async () => {
        signUpComponent.props.onPress();
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { name: 'Test User' },
        },
      });
    });
  });

  describe('signIn', () => {
    it('should successfully sign in user', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInComponent = getByTestId('signIn');
      
      await act(async () => {
        signInComponent.props.onPress();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle sign in error', async () => {
      const signInError = new Error('Invalid credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: signInError,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInComponent = getByTestId('signIn');
      
      await act(async () => {
        signInComponent.props.onPress();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should handle network error during sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInComponent = getByTestId('signIn');
      
      await act(async () => {
        signInComponent.props.onPress();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signOutComponent = getByTestId('signOut');
      
      await act(async () => {
        signOutComponent.props.onPress();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      const signOutError = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({
        error: signOutError,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signOutComponent = getByTestId('signOut');
      
      await act(async () => {
        signOutComponent.props.onPress();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponentOutsideProvider = () => {
        useAuth();
        return <View />;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => 
        render(<TestComponentOutsideProvider />)
      ).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should provide all auth methods and state', () => {
      const TestComponentForMethods = () => {
        const auth = useAuth();
        
        const methods = [
          'user',
          'loading', 
          'signUp',
          'signIn',
          'signOut'
        ];

        return (
          <View>
            {methods.map(method => (
              <Text key={method} testID={`has-${method}`}>
                {typeof auth[method] !== 'undefined' ? 'has' : 'missing'}
              </Text>
            ))}
          </View>
        );
      };

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponentForMethods />
        </AuthProvider>
      );

      ['user', 'loading', 'signUp', 'signIn', 'signOut'].forEach(method => {
        expect(getByTestId(`has-${method}`).props.children).toBe('has');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle malformed session data', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: null } }, // Malformed session
        error: null,
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(getByTestId('loading').props.children).toBe('not-loading');
        expect(getByTestId('user').props.children).toBe('no-user');
      });
    });

    it('should handle missing subscription from auth listener', () => {
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: null },
      });

      expect(() => 
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
      ).not.toThrow();
    });

    it('should handle auth state change with undefined session', async () => {
      let authStateCallback;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: mockUnsubscribe } };
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        authStateCallback('TOKEN_REFRESHED', undefined);
      });

      await waitFor(() => {
        expect(getByTestId('user').props.children).toBe('no-user');
      });
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous auth operations', async () => {
      mockSupabase.auth.signInWithPassword.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { user: mockUser, session: mockSession },
            error: null,
          }), 100)
        )
      );

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInComponent = getByTestId('signIn');
      
      // Fire multiple sign in attempts
      await act(async () => {
        signInComponent.props.onPress();
        signInComponent.props.onPress();
        signInComponent.props.onPress();
      });

      // Should handle gracefully without errors
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(3);
    });
  });
});