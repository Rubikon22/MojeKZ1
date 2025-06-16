import PropTypes from 'prop-types';

// Common prop types
export const BookPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  description: PropTypes.string,
  notes: PropTypes.string,
  status: PropTypes.string.isRequired,
  rating: PropTypes.number,
  coverImage: PropTypes.string,
  dateAdded: PropTypes.string,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
});

export const UserPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  user_metadata: PropTypes.object,
});

export const ThemePropType = PropTypes.shape({
  colors: PropTypes.shape({
    primary: PropTypes.string.isRequired,
    background: PropTypes.string.isRequired,
    surface: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    textSecondary: PropTypes.string.isRequired,
    card: PropTypes.string.isRequired,
    error: PropTypes.string.isRequired,
  }).isRequired,
});

export const NavigationPropType = PropTypes.shape({
  navigate: PropTypes.func.isRequired,
  goBack: PropTypes.func.isRequired,
  setParams: PropTypes.func,
  state: PropTypes.object,
});

export const RoutePropType = PropTypes.shape({
  params: PropTypes.object,
  name: PropTypes.string.isRequired,
});