import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_CONFIG, COLORS } from '../constants';
import { useTheme } from '../context/ThemeContext';

const StarRating = ({ rating = 0, onRatingChange, size = 24, readonly = false }) => {
  const { theme } = useTheme();
  
  const renderStars = () => {
    const stars = [];

    for (let i = 1; i <= APP_CONFIG.MAX_RATING; i++) {
      const name = i <= rating ? 'star' : 'star-outline';
      const color = i <= rating ? COLORS.STAR_ACTIVE : COLORS.STAR_INACTIVE;
      
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={readonly}
          onPress={() => !readonly && onRatingChange?.(i)}
          style={styles.starContainer}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Ionicons name={name} size={size} color={color} />
        </TouchableOpacity>
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      {renderStars()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  starContainer: {
    marginRight: 2,
  },
});

StarRating.propTypes = {
  rating: PropTypes.number,
  onRatingChange: PropTypes.func,
  size: PropTypes.number,
  readonly: PropTypes.bool,
};

StarRating.defaultProps = {
  rating: 0,
  onRatingChange: null,
  size: 24,
  readonly: false,
};

export default StarRating;