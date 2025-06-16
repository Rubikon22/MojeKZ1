import { Platform, Dimensions, StatusBar } from 'react-native';
import { getStatusBarHeight } from 'react-native-safe-area-context';

/**
 * Device information utilities
 */
export class DeviceInfo {
  /**
   * Get comprehensive device information
   * @returns {object} Device info object
   */
  static getDeviceInfo() {
    const { width, height } = Dimensions.get('window');
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
    
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isWeb: Platform.OS === 'web',
      isAndroid: Platform.OS === 'android',
      isIOS: Platform.OS === 'ios',
      
      // Screen dimensions
      window: { width, height },
      screen: { width: screenWidth, height: screenHeight },
      
      // Device characteristics
      isTablet: this.isTablet(),
      isLandscape: width > height,
      isPortrait: width <= height,
      
      // Status bar
      statusBarHeight: this.getStatusBarHeight(),
      
      // Device type classification
      deviceType: this.getDeviceType(),
      
      // Performance characteristics
      estimatedPerformance: this.getPerformanceClass(),
    };
  }

  /**
   * Check if device is tablet
   * @returns {boolean}
   */
  static isTablet() {
    const { width, height } = Dimensions.get('window');
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    const minDimension = Math.min(width, height);
    
    // Tablet detection logic
    return minDimension >= 600 && aspectRatio < 1.6;
  }

  /**
   * Get device type classification
   * @returns {string}
   */
  static getDeviceType() {
    const { width } = Dimensions.get('window');
    
    if (this.isTablet()) return 'tablet';
    if (width < 360) return 'small';
    if (width < 414) return 'medium';
    return 'large';
  }

  /**
   * Get estimated performance class
   * @returns {string}
   */
  static getPerformanceClass() {
    const { width, height } = Dimensions.get('window');
    const totalPixels = width * height;
    
    // Simple heuristic based on screen resolution
    if (totalPixels > 2000000) return 'high'; // 1440p+
    if (totalPixels > 1000000) return 'medium'; // 1080p
    return 'low'; // 720p and below
  }

  /**
   * Get status bar height
   * @returns {number}
   */
  static getStatusBarHeight() {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight || 0;
    }
    
    try {
      return getStatusBarHeight();
    } catch {
      return Platform.OS === 'ios' ? 20 : 0;
    }
  }

  /**
   * Get safe area insets estimation
   * @returns {object}
   */
  static getSafeAreaInsets() {
    const statusBarHeight = this.getStatusBarHeight();
    const { width, height } = Dimensions.get('window');
    
    // Basic safe area estimation
    const insets = {
      top: statusBarHeight,
      bottom: 0,
      left: 0,
      right: 0,
    };

    // iOS specific adjustments
    if (Platform.OS === 'ios') {
      // iPhone X and newer detection
      if (height >= 812 && width >= 375) {
        insets.bottom = 34; // Home indicator
        insets.top = 44; // Status bar + notch
      }
    }

    return insets;
  }

  /**
   * Get optimal image dimensions for device
   * @returns {object}
   */
  static getOptimalImageDimensions() {
    const deviceType = this.getDeviceType();
    const performanceClass = this.getPerformanceClass();
    
    const dimensions = {
      small: { width: 300, height: 450 },
      medium: { width: 400, height: 600 },
      large: { width: 500, height: 750 },
      tablet: { width: 600, height: 900 },
    };

    const baseDimensions = dimensions[deviceType] || dimensions.medium;

    // Adjust for performance
    if (performanceClass === 'low') {
      return {
        width: Math.floor(baseDimensions.width * 0.8),
        height: Math.floor(baseDimensions.height * 0.8),
      };
    }

    if (performanceClass === 'high') {
      return {
        width: Math.floor(baseDimensions.width * 1.2),
        height: Math.floor(baseDimensions.height * 1.2),
      };
    }

    return baseDimensions;
  }

  /**
   * Check if device supports specific features
   * @returns {object}
   */
  static getFeatureSupport() {
    return {
      camera: Platform.OS !== 'web',
      fileSystem: Platform.OS !== 'web',
      asyncStorage: true,
      notifications: Platform.OS !== 'web',
      biometrics: Platform.OS !== 'web',
      haptics: Platform.OS !== 'web',
      networking: true,
      geolocation: Platform.OS !== 'web',
      accelerometer: Platform.OS !== 'web',
      gyroscope: Platform.OS !== 'web',
    };
  }

  /**
   * Get optimal app configuration for device
   * @returns {object}
   */
  static getOptimalConfig() {
    const deviceType = this.getDeviceType();
    const performanceClass = this.getPerformanceClass();
    const isTablet = this.isTablet();

    return {
      // Animation settings
      animations: {
        enabled: performanceClass !== 'low',
        duration: performanceClass === 'high' ? 300 : 200,
        useNativeDriver: true,
      },

      // Image settings
      images: {
        quality: performanceClass === 'high' ? 0.9 : 0.7,
        maxDimensions: this.getOptimalImageDimensions(),
        cacheEnabled: true,
        cacheSize: performanceClass === 'high' ? 100 : 50, // MB
      },

      // UI settings
      ui: {
        showAnimations: performanceClass !== 'low',
        complexTransitions: performanceClass === 'high',
        shadowsEnabled: performanceClass !== 'low',
        blurEnabled: performanceClass === 'high',
      },

      // List settings
      lists: {
        initialNumToRender: isTablet ? 15 : 10,
        maxToRenderPerBatch: isTablet ? 10 : 5,
        windowSize: isTablet ? 21 : 10,
        removeClippedSubviews: performanceClass === 'low',
      },

      // Storage settings
      storage: {
        maxCacheSize: performanceClass === 'high' ? 100 : 50, // MB
        compressionLevel: performanceClass === 'low' ? 0.5 : 0.8,
        enableBackups: true,
        maxBackups: performanceClass === 'high' ? 10 : 5,
      },
    };
  }

  /**
   * Monitor device changes
   * @param {function} callback - Called when device info changes
   * @returns {function} Cleanup function
   */
  static monitorDeviceChanges(callback) {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      const updatedInfo = this.getDeviceInfo();
      callback(updatedInfo);
    });

    return () => {
      subscription?.remove();
    };
  }
}

// Export commonly used functions
export const isTablet = () => DeviceInfo.isTablet();
export const getDeviceType = () => DeviceInfo.getDeviceType();
export const getOptimalConfig = () => DeviceInfo.getOptimalConfig();
export const getDeviceInfo = () => DeviceInfo.getDeviceInfo();