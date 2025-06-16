import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '../../src/components/StarRating';
import { ThemeProvider } from '../../src/context/ThemeContext';

// Mock AsyncStorage for ThemeContext
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: (props) => <View testID={`star-icon-${props.name}`} {...props} />,
  };
});

// Mock constants
jest.mock('../../src/constants', () => ({
  APP_CONFIG: {
    MAX_RATING: 5,
  },
  COLORS: {
    STAR_ACTIVE: '#FFC107',
    STAR_INACTIVE: '#E0E0E0',
  },
}));

// Helper component to test StarRating within theme context
const StarRatingWithTheme = (props) => (
  <ThemeProvider>
    <StarRating {...props} />
  </ThemeProvider>
);

describe('StarRating Component', () => {
  describe('rendering', () => {
    it('should render 5 stars by default', () => {
      const { getAllByTestId } = render(<StarRatingWithTheme />);
      
      const starIcons = getAllByTestId(/star-icon/);
      expect(starIcons).toHaveLength(5);
    });

    it('should render filled stars for rating', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3} />
      );
      
      const filledStars = getAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(3);
      expect(emptyStars).toHaveLength(2);
    });

    it('should render all empty stars for rating 0', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating={0} />
      );
      
      const filledStars = queryAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(0);
      expect(emptyStars).toHaveLength(5);
    });

    it('should render all filled stars for rating 5', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating={5} />
      );
      
      const filledStars = getAllByTestId('star-icon-star');
      const emptyStars = queryAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(5);
      expect(emptyStars).toHaveLength(0);
    });

    it('should handle decimal ratings by flooring', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3.7} />
      );
      
      const filledStars = getAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(3);
      expect(emptyStars).toHaveLength(2);
    });

    it('should handle negative ratings', () => {
      const { queryAllByTestId, getAllByTestId } = render(
        <StarRatingWithTheme rating={-1} />
      );
      
      const filledStars = queryAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(0);
      expect(emptyStars).toHaveLength(5);
    });

    it('should handle ratings above maximum', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating={10} />
      );
      
      const filledStars = getAllByTestId('star-icon-star');
      const emptyStars = queryAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(5);
      expect(emptyStars).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('should call onRatingChange when star is pressed', () => {
      const mockOnRatingChange = jest.fn();
      const { getAllByTestId } = render(
        <StarRatingWithTheme 
          rating={2} 
          onRatingChange={mockOnRatingChange}
        />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      fireEvent.press(starIcons[3]); // Press 4th star (index 3, rating 4)
      
      expect(mockOnRatingChange).toHaveBeenCalledWith(4);
    });

    it('should call onRatingChange with correct rating when first star is pressed', () => {
      const mockOnRatingChange = jest.fn();
      const { getAllByTestId } = render(
        <StarRatingWithTheme 
          rating={0} 
          onRatingChange={mockOnRatingChange}
        />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      fireEvent.press(starIcons[0]); // Press 1st star
      
      expect(mockOnRatingChange).toHaveBeenCalledWith(1);
    });

    it('should call onRatingChange with correct rating when last star is pressed', () => {
      const mockOnRatingChange = jest.fn();
      const { getAllByTestId } = render(
        <StarRatingWithTheme 
          rating={3} 
          onRatingChange={mockOnRatingChange}
        />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      fireEvent.press(starIcons[4]); // Press 5th star
      
      expect(mockOnRatingChange).toHaveBeenCalledWith(5);
    });

    it('should not call onRatingChange when readonly', () => {
      const mockOnRatingChange = jest.fn();
      const { getAllByTestId } = render(
        <StarRatingWithTheme 
          rating={2} 
          onRatingChange={mockOnRatingChange}
          readonly={true}
        />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      fireEvent.press(starIcons[3]);
      
      expect(mockOnRatingChange).not.toHaveBeenCalled();
    });

    it('should not call onRatingChange when onRatingChange is not provided', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={2} />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      
      // Should not throw error
      expect(() => fireEvent.press(starIcons[3])).not.toThrow();
    });

    it('should update visual state when rating changes', () => {
      const mockOnRatingChange = jest.fn();
      const { getAllByTestId, rerender } = render(
        <StarRatingWithTheme 
          rating={2} 
          onRatingChange={mockOnRatingChange}
        />
      );
      
      // Initial state: 2 filled, 3 empty
      expect(getAllByTestId('star-icon-star')).toHaveLength(2);
      expect(getAllByTestId('star-icon-star-outline')).toHaveLength(3);
      
      // Update rating to 4
      rerender(
        <StarRatingWithTheme 
          rating={4} 
          onRatingChange={mockOnRatingChange}
        />
      );
      
      // New state: 4 filled, 1 empty
      expect(getAllByTestId('star-icon-star')).toHaveLength(4);
      expect(getAllByTestId('star-icon-star-outline')).toHaveLength(1);
    });
  });

  describe('customization', () => {
    it('should handle custom size prop', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3} size={32} />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      starIcons.forEach(star => {
        expect(star.props.size).toBe(32);
      });
    });

    it('should use default size when not provided', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3} />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      starIcons.forEach(star => {
        expect(star.props.size).toBe(24); // Default size
      });
    });

    it('should handle different size values', () => {
      const sizes = [16, 24, 32, 48];
      
      sizes.forEach(size => {
        const { getAllByTestId } = render(
          <StarRatingWithTheme rating={3} size={size} />
        );
        
        const starIcons = getAllByTestId(/star-icon/);
        starIcons.forEach(star => {
          expect(star.props.size).toBe(size);
        });
      });
    });
  });

  describe('accessibility', () => {
    it('should render touchable components for interactive stars', () => {
      const { UNSAFE_getAllByType } = render(
        <StarRatingWithTheme 
          rating={2} 
          onRatingChange={jest.fn()}
        />
      );
      
      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      expect(touchableOpacities).toHaveLength(5);
    });

    it('should disable touch for readonly stars', () => {
      const { UNSAFE_getAllByType } = render(
        <StarRatingWithTheme 
          rating={2} 
          onRatingChange={jest.fn()}
          readonly={true}
        />
      );
      
      const touchableOpacities = UNSAFE_getAllByType('TouchableOpacity');
      
      // TouchableOpacity should be disabled
      touchableOpacities.forEach(touchable => {
        expect(touchable.props.disabled).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined rating gracefully', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating={undefined} />
      );
      
      const filledStars = queryAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(0);
      expect(emptyStars).toHaveLength(5);
    });

    it('should handle null rating gracefully', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating={null} />
      );
      
      const filledStars = queryAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(0);
      expect(emptyStars).toHaveLength(5);
    });

    it('should handle string rating by converting to number', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating="3" />
      );
      
      const filledStars = getAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(3);
      expect(emptyStars).toHaveLength(2);
    });

    it('should handle invalid string rating', () => {
      const { getAllByTestId, queryAllByTestId } = render(
        <StarRatingWithTheme rating="invalid" />
      );
      
      const filledStars = queryAllByTestId('star-icon-star');
      const emptyStars = getAllByTestId('star-icon-star-outline');
      
      expect(filledStars).toHaveLength(0);
      expect(emptyStars).toHaveLength(5);
    });

    it('should handle zero size gracefully', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3} size={0} />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      starIcons.forEach(star => {
        expect(star.props.size).toBe(0);
      });
    });

    it('should handle negative size gracefully', () => {
      const { getAllByTestId } = render(
        <StarRatingWithTheme rating={3} size={-10} />
      );
      
      const starIcons = getAllByTestId(/star-icon/);
      starIcons.forEach(star => {
        expect(star.props.size).toBe(-10);
      });
    });
  });

  describe('prop validation', () => {
    // Note: PropTypes warnings would be tested in development mode
    it('should accept all valid prop combinations', () => {
      const validProps = [
        { rating: 0 },
        { rating: 5 },
        { rating: 3, size: 24 },
        { rating: 2, readonly: true },
        { rating: 4, onRatingChange: jest.fn() },
        { rating: 1, size: 32, readonly: false, onRatingChange: jest.fn() },
      ];

      validProps.forEach(props => {
        expect(() => render(<StarRatingWithTheme {...props} />)).not.toThrow();
      });
    });
  });
});