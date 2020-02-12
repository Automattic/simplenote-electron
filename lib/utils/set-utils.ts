export const include = <T>(set: Set<T>, value: T): Set<T> => {
  if (set.has(value)) {
    return set;
  }

  return new Set(set).add(value);
};

export const exclude = <T>(set: Set<T>, value: T): Set<T> => {
  if (!set.has(value)) {
    return set;
  }

  const without = new Set(set);
  without.delete(value);
  return without;
};

export const toggle = <T>(set: Set<T>, value: T): Set<T> =>
  set.has(value) ? exclude(set, value) : include(set, value);
