import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Network status utilities for React Native
 */
export class NetworkStatus {
  static listeners = new Set();
  static currentState = null;

  /**
   * Initialize network monitoring
   */
  static initialize() {
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204,
      reachabilityLongTimeout: 60 * 1000, // 60s
      reachabilityShortTimeout: 5 * 1000, // 5s
      reachabilityRequestTimeout: 15 * 1000, // 15s
    });

    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      this.currentState = state;
      this.notifyListeners(state);
    });
  }

  /**
   * Get current network state
   * @returns {Promise<object>} Network state
   */
  static async getCurrentState() {
    if (this.currentState) {
      return this.currentState;
    }
    
    try {
      const state = await NetInfo.fetch();
      this.currentState = state;
      return state;
    } catch (error) {
      console.error('Error fetching network state:', error);
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        details: null,
      };
    }
  }

  /**
   * Check if device is online
   * @returns {Promise<boolean>}
   */
  static async isOnline() {
    const state = await this.getCurrentState();
    return state.isConnected && state.isInternetReachable;
  }

  /**
   * Check if device is offline
   * @returns {Promise<boolean>}
   */
  static async isOffline() {
    return !(await this.isOnline());
  }

  /**
   * Get connection type
   * @returns {Promise<string>}
   */
  static async getConnectionType() {
    const state = await this.getCurrentState();
    return state.type;
  }

  /**
   * Get connection quality estimation
   * @returns {Promise<string>} 'excellent' | 'good' | 'poor' | 'offline'
   */
  static async getConnectionQuality() {
    const state = await this.getCurrentState();
    
    if (!state.isConnected || !state.isInternetReachable) {
      return 'offline';
    }

    const { type, details } = state;

    switch (type) {
      case 'wifi':
        // WiFi is generally good quality
        return details?.strength > 70 ? 'excellent' : 'good';
      
      case 'cellular':
        // Check cellular generation
        if (details?.cellularGeneration === '4g' || details?.cellularGeneration === '5g') {
          return 'good';
        } else if (details?.cellularGeneration === '3g') {
          return 'poor';
        } else {
          return 'poor';
        }
      
      case 'ethernet':
        return 'excellent';
      
      default:
        return 'poor';
    }
  }

  /**
   * Add listener for network state changes
   * @param {function} listener - Callback function
   * @returns {function} Unsubscribe function
   */
  static addListener(listener) {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @param {object} state - Network state
   */
  static notifyListeners(state) {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Wait for network connection
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>}
   */
  static async waitForConnection(timeout = 30000) {
    const isCurrentlyOnline = await this.isOnline();
    if (isCurrentlyOnline) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener(async (state) => {
        if (state.isConnected && state.isInternetReachable) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Execute function when online
   * @param {function} fn - Function to execute
   * @param {object} options - Options
   * @returns {Promise<any>}
   */
  static async executeWhenOnline(fn, options = {}) {
    const { waitForConnection = true, timeout = 30000 } = options;

    const isCurrentlyOnline = await this.isOnline();
    
    if (isCurrentlyOnline) {
      return await fn();
    }

    if (!waitForConnection) {
      throw new Error('Device is offline and waitForConnection is false');
    }

    const connectionEstablished = await this.waitForConnection(timeout);
    
    if (!connectionEstablished) {
      throw new Error('Connection timeout: Unable to establish internet connection');
    }

    return await fn();
  }
}

/**
 * React hook for network status
 * @returns {object} Network status and utilities
 */
export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');
  const [connectionQuality, setConnectionQuality] = useState('unknown');

  useEffect(() => {
    // Initialize network status
    NetworkStatus.initialize();

    // Get initial state
    NetworkStatus.getCurrentState().then(state => {
      setNetworkState(state);
      setIsOnline(state.isConnected && state.isInternetReachable);
      setConnectionType(state.type);
    });

    // Subscribe to changes
    const unsubscribe = NetworkStatus.addListener(async (state) => {
      setNetworkState(state);
      setIsOnline(state.isConnected && state.isInternetReachable);
      setConnectionType(state.type);
      
      const quality = await NetworkStatus.getConnectionQuality();
      setConnectionQuality(quality);
    });

    return unsubscribe;
  }, []);

  return {
    networkState,
    isOnline,
    isOffline: !isOnline,
    connectionType,
    connectionQuality,
    
    // Utility functions
    waitForConnection: NetworkStatus.waitForConnection,
    executeWhenOnline: NetworkStatus.executeWhenOnline,
    refresh: () => NetworkStatus.getCurrentState(),
  };
};

/**
 * Higher-order component for network-aware components
 * @param {React.Component} WrappedComponent - Component to wrap
 * @returns {React.Component} Network-aware component
 */
export const withNetworkStatus = (WrappedComponent) => {
  return (props) => {
    const networkStatus = useNetworkStatus();
    
    return (
      <WrappedComponent 
        {...props} 
        networkStatus={networkStatus}
      />
    );
  };
};

// Initialize network monitoring when module is imported
if (typeof NetInfo !== 'undefined') {
  NetworkStatus.initialize();
}