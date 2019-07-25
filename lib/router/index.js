export const setUrl = (property, value, clearUrl) => {
  const state = clearUrl ? {} : getStateFromUrl();
  if (property && value) {
    state[property] = value;
  } else if (property) {
    delete state[property];
  }
  pushStateToHistory(state);
};

export const getStateFromUrl = () => {
  return window.location.pathname
    .split('/')
    .reduce(function(accumulator, currentValue, index) {
      if (index % 2) {
        accumulator[index - 1] = currentValue;
      }
      return accumulator;
    }, {});
};

const pushStateToHistory = state => {
  let url = '';
  if (state.note) {
    url += `/note/${state.note}`;
  }
  if (state.tag) {
    url += `/tag/${state.tag}`;
  }
  if (state.search) {
    url += `/search/${state.search}`;
  }
  window.history.pushState(null, null, url);
};
