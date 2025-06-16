import { Dimensions } from 'react-native';
import {
  DEVICE_TYPES,
  getDeviceType,
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  spacing,
  isTablet,
  isLandscape,
  getGridColumns,
  getResponsivePadding,
  getCardWidth,
  getBookCoverSize,
} from '../../src/utils/responsive';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(),
  },
}));

describe('Responsive Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceType', () => {
    it('should return SMALL for width < 360', () => {
      Dimensions.get.mockReturnValue({ width: 320, height: 568 });
      expect(getDeviceType()).toBe(DEVICE_TYPES.SMALL);
    });

    it('should return MEDIUM for width 360-599', () => {
      Dimensions.get.mockReturnValue({ width: 400, height: 800 });
      expect(getDeviceType()).toBe(DEVICE_TYPES.MEDIUM);
    });

    it('should return LARGE for width 600-767', () => {
      Dimensions.get.mockReturnValue({ width: 650, height: 900 });
      expect(getDeviceType()).toBe(DEVICE_TYPES.LARGE);
    });

    it('should return TABLET for width >= 768', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 });
      expect(getDeviceType()).toBe(DEVICE_TYPES.TABLET);
    });
  });

  describe('scale', () => {
    it('should scale based on base width', () => {
      Dimensions.get.mockReturnValue({ width: 720, height: 1280 }); // 2x base
      expect(scale(16)).toBe(32); // 720/360 * 16 = 32
    });

    it('should handle base width scaling', () => {
      Dimensions.get.mockReturnValue({ width: 360, height: 640 }); // Base width
      expect(scale(20)).toBe(20); // 360/360 * 20 = 20
    });

    it('should handle smaller screen scaling', () => {
      Dimensions.get.mockReturnValue({ width: 180, height: 320 }); // Half base
      expect(scale(10)).toBe(5); // 180/360 * 10 = 5
    });
  });

  describe('verticalScale', () => {
    it('should scale vertically based on base height', () => {
      Dimensions.get.mockReturnValue({ width: 360, height: 1280 }); // 2x base height
      expect(verticalScale(16)).toBe(32); // 1280/640 * 16 = 32
    });

    it('should handle base height scaling', () => {
      Dimensions.get.mockReturnValue({ width: 360, height: 640 }); // Base height
      expect(verticalScale(20)).toBe(20); // 640/640 * 20 = 20
    });
  });

  describe('moderateScale', () => {
    it('should moderate scale with default factor', () => {
      Dimensions.get.mockReturnValue({ width: 720, height: 1280 }); // 2x base
      const result = moderateScale(16); // Default factor 0.5
      const expected = 16 + (32 - 16) * 0.5; // 16 + 8 = 24
      expect(result).toBe(expected);
    });

    it('should moderate scale with custom factor', () => {
      Dimensions.get.mockReturnValue({ width: 720, height: 1280 }); // 2x base
      const result = moderateScale(16, 0.8); // Custom factor 0.8
      const expected = 16 + (32 - 16) * 0.8; // 16 + 12.8 = 28.8
      expect(result).toBe(expected);
    });

    it('should handle zero factor', () => {
      Dimensions.get.mockReturnValue({ width: 720, height: 1280 });
      const result = moderateScale(16, 0);
      expect(result).toBe(16); // No scaling applied
    });
  });

  describe('responsiveFontSize', () => {
    it('should return moderated font size', () => {
      Dimensions.get.mockReturnValue({ width: 720, height: 1280 });
      const result = responsiveFontSize(16);
      expect(result).toBeGreaterThanOrEqual(16 * 0.8); // Minimum 80% of original
    });

    it('should enforce minimum font size', () => {
      Dimensions.get.mockReturnValue({ width: 180, height: 320 }); // Very small screen
      const result = responsiveFontSize(16);
      expect(result).toBeGreaterThanOrEqual(16 * 0.8); // Should be at least 12.8
    });
  });

  describe('spacing', () => {
    it('should provide consistent spacing values', () => {
      Dimensions.get.mockReturnValue({ width: 360, height: 640 }); // Base dimensions
      
      expect(spacing.xs).toBeGreaterThan(0);
      expect(spacing.sm).toBeGreaterThan(spacing.xs);
      expect(spacing.md).toBeGreaterThan(spacing.sm);
      expect(spacing.lg).toBeGreaterThan(spacing.md);
      expect(spacing.xl).toBeGreaterThan(spacing.lg);
      expect(spacing.xxl).toBeGreaterThan(spacing.xl);
    });
  });

  describe('isTablet', () => {
    it('should return true for tablet dimensions', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 });
      expect(isTablet()).toBe(true);
    });

    it('should return false for phone dimensions', () => {
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      expect(isTablet()).toBe(false);
    });
  });

  describe('isLandscape', () => {
    it('should return true for landscape orientation', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 600 });
      expect(isLandscape()).toBe(true);
    });

    it('should return false for portrait orientation', () => {
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      expect(isLandscape()).toBe(false);
    });

    it('should return false for square dimensions', () => {
      Dimensions.get.mockReturnValue({ width: 600, height: 600 });
      expect(isLandscape()).toBe(false);
    });
  });

  describe('getGridColumns', () => {
    it('should return 4 columns for tablet in landscape', () => {
      Dimensions.get.mockReturnValue({ width: 1200, height: 800 }); // Tablet landscape
      expect(getGridColumns()).toBe(4);
    });

    it('should return 3 columns for phone in landscape', () => {
      Dimensions.get.mockReturnValue({ width: 812, height: 375 }); // Phone landscape
      expect(getGridColumns()).toBe(3);
    });

    it('should return 3 columns for tablet in portrait', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 }); // Tablet portrait
      expect(getGridColumns()).toBe(3);
    });

    it('should return 2 columns for phone in portrait', () => {
      Dimensions.get.mockReturnValue({ width: 375, height: 812 }); // Phone portrait
      expect(getGridColumns()).toBe(2);
    });
  });

  describe('getResponsivePadding', () => {
    it('should return appropriate padding for each device type', () => {
      // Small device
      Dimensions.get.mockReturnValue({ width: 320, height: 568 });
      const smallPadding = getResponsivePadding();
      
      // Medium device
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      const mediumPadding = getResponsivePadding();
      
      // Large device
      Dimensions.get.mockReturnValue({ width: 650, height: 900 });
      const largePadding = getResponsivePadding();
      
      // Tablet
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 });
      const tabletPadding = getResponsivePadding();
      
      expect(smallPadding).toBeLessThan(mediumPadding);
      expect(mediumPadding).toBeLessThan(largePadding);
      expect(largePadding).toBeLessThan(tabletPadding);
    });
  });

  describe('getCardWidth', () => {
    it('should calculate card width for phone', () => {
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      const cardWidth = getCardWidth();
      
      expect(cardWidth).toBeGreaterThan(0);
      expect(cardWidth).toBeLessThan(375);
    });

    it('should calculate card width for tablet with columns', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 });
      const cardWidth = getCardWidth();
      
      expect(cardWidth).toBeGreaterThan(0);
      expect(cardWidth).toBeLessThan(800 / 3); // Should account for multiple columns
    });
  });

  describe('getBookCoverSize', () => {
    it('should return appropriate cover size for small device', () => {
      Dimensions.get.mockReturnValue({ width: 320, height: 568 });
      const size = getBookCoverSize();
      
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
      expect(size.width).toBe(60);
      expect(size.height).toBe(90);
    });

    it('should return appropriate cover size for medium device', () => {
      Dimensions.get.mockReturnValue({ width: 375, height: 812 });
      const size = getBookCoverSize();
      
      expect(size.width).toBe(70);
      expect(size.height).toBe(100);
    });

    it('should return appropriate cover size for large device', () => {
      Dimensions.get.mockReturnValue({ width: 650, height: 900 });
      const size = getBookCoverSize();
      
      expect(size.width).toBe(80);
      expect(size.height).toBe(110);
    });

    it('should return appropriate cover size for tablet', () => {
      Dimensions.get.mockReturnValue({ width: 800, height: 1200 });
      const size = getBookCoverSize();
      
      expect(size.width).toBe(100);
      expect(size.height).toBe(140);
    });

    it('should maintain aspect ratio', () => {
      const sizes = [
        { width: 320, height: 568 },
        { width: 375, height: 812 },
        { width: 650, height: 900 },
        { width: 800, height: 1200 },
      ];

      sizes.forEach(dimensions => {
        Dimensions.get.mockReturnValue(dimensions);
        const size = getBookCoverSize();
        const aspectRatio = size.height / size.width;
        expect(aspectRatio).toBeCloseTo(1.5, 1); // Should be close to 3:2 ratio
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined dimensions gracefully', () => {
      Dimensions.get.mockReturnValue({ width: undefined, height: undefined });
      
      expect(() => getDeviceType()).not.toThrow();
      expect(() => isTablet()).not.toThrow();
      expect(() => isLandscape()).not.toThrow();
    });

    it('should handle zero dimensions', () => {
      Dimensions.get.mockReturnValue({ width: 0, height: 0 });
      
      expect(getDeviceType()).toBe(DEVICE_TYPES.SMALL);
      expect(isTablet()).toBe(false);
      expect(isLandscape()).toBe(false);
    });

    it('should handle very large dimensions', () => {
      Dimensions.get.mockReturnValue({ width: 9999, height: 9999 });
      
      expect(getDeviceType()).toBe(DEVICE_TYPES.TABLET);
      expect(isTablet()).toBe(true);
      expect(isLandscape()).toBe(false); // Square, so not landscape
    });
  });
});