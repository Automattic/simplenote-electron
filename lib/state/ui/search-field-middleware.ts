import * as A from '../action-types';
import * as S from '../';

const searchFields = new Set<Function>();

export const registerSearchField = (focus: Function) => searchFields.add(focus);

export const middleware: S.Middleware = () => {
  return next => (action: A.ActionType) => {
    const result = next(action);

    switch (action.type) {
      case 'FOCUS_SEARCH_FIELD':
        searchFields.forEach(focus => focus());
        break;
    }

    return result;
  };
};

export default middleware;
