import { Dimensions, PixelRatio } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define device types based on screen width
export const DEVICE_TYPES = {
  SMALL: 'small',   // < 360dp
  MEDIUM: 'medium', // 360-600dp  
  LARGE: 'large',   // > 600dp
  TABLET: 'tablet'  // > 768dp
};

// Get current device type
export const getDeviceType = () => {
  if (screenWidth < 360) return DEVICE_TYPES.SMALL;
  if (screenWidth < 600) return DEVICE_TYPES.MEDIUM;
  if (screenWidth < 768) return DEVICE_TYPES.LARGE;
  return DEVICE_TYPES.TABLET;
};

// Scale based on device size
export const scale = (size) => {
  const baseWidth = 360; // Base design width
  return (screenWidth / baseWidth) * size;
};

// Vertical scale
export const verticalScale = (size) => {
  const baseHeight = 640; // Base design height
  return (screenHeight / baseHeight) * size;
};

// Moderate scale - less aggressive scaling
export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Responsive font size
export const responsiveFontSize = (size) => {
  const newSize = moderateScale(size);
  return Math.max(newSize, size * 0.8); // Minimum 80% of original size
};

// Responsive spacing
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
};

// Screen dimensions
export const screenDimensions = {
  width: screenWidth,
  height: screenHeight,
};

// Check if device is tablet
export const isTablet = () => {
  return getDeviceType() === DEVICE_TYPES.TABLET;
};

// Check orientation
export const isLandscape = () => {
  return screenWidth > screenHeight;
};

// Responsive grid columns
export const getGridColumns = () => {
  const deviceType = getDeviceType();
  if (isLandscape()) {
    return deviceType === DEVICE_TYPES.TABLET ? 4 : 3;
  }
  return deviceType === DEVICE_TYPES.TABLET ? 3 : 2;
};

// Responsive padding/margin
export const getResponsivePadding = () => {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case DEVICE_TYPES.SMALL:
      return spacing.sm;
    case DEVICE_TYPES.MEDIUM:
      return spacing.md;
    case DEVICE_TYPES.LARGE:
      return spacing.lg;
    case DEVICE_TYPES.TABLET:
      return spacing.xl;
    default:
      return spacing.md;
  }
};

// Component size helpers
export const getCardWidth = () => {
  const deviceType = getDeviceType();
  const padding = getResponsivePadding() * 2;
  
  if (isTablet()) {
    const columns = getGridColumns();
    return (screenWidth - padding - ((columns - 1) * spacing.md)) / columns;
  }
  
  return screenWidth - padding;
};

// Book cover dimensions
export const getBookCoverSize = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case DEVICE_TYPES.SMALL:
      return { width: 60, height: 90 };
    case DEVICE_TYPES.MEDIUM:
      return { width: 70, height: 100 };
    case DEVICE_TYPES.LARGE:
      return { width: 80, height: 110 };
    case DEVICE_TYPES.TABLET:
      return { width: 100, height: 140 };
    default:
      return { width: 70, height: 100 };
  }
};

// Form input sizes
export const getFormInputHeight = () => {
  return moderateScale(48);
};

// Button sizes
export const getButtonHeight = () => {
  return moderateScale(44);
};