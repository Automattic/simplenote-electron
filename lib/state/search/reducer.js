import { combineReducers } from 'redux';
import { FILTER_NOTES, RESET_SEARCH, SEARCH_NOTES } from '../action-types';

export const filteredNoteIds = (state = null, { type, visibleNoteIds }) => {
  switch (type) {
    case FILTER_NOTES:
      return new Set(visibleNoteIds);
    case RESET_SEARCH:
      return null;
    default:
      return state;
  }
};

export const searchQuery = (state = '', { type, query }) => {
  switch (type) {
    case RESET_SEARCH:
      return '';

    case SEARCH_NOTES:
      return query;

    default:
      return state;
  }
};

export const searchStatus = (state = 'no-search', { type }) => {
  switch (type) {
    case FILTER_NOTES:
      return 'search-resolved';
    case RESET_SEARCH:
      return 'no-search';
    case SEARCH_NOTES:
      return 'search-udpating';
    default:
      return state;
  }
};

export default combineReducers({ filteredNoteIds, searchQuery, searchStatus });
