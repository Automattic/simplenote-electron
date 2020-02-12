import * as set from '../set-utils';

it('should return same reference if included value already in set', () => {
  const s = new Set([1, 2, 3]);
  expect(set.include(s, 2)).toBe(s);
});

it('should add item to set', () => {
  expect(set.include(new Set([1, 2, 3]), 4)).toEqual(new Set([1, 2, 3, 4]));
});

it('should return same reference if excluded value already missing from set', () => {
  const s = new Set([1, 2, 3]);
  expect(set.exclude(s, 5)).toBe(s);
});

it('should remove item from set', () => {
  expect(set.exclude(new Set([1, 2, 3]), 2)).toEqual(new Set([1, 3]));
});

it('should remove item when toggling existing value', () => {
  expect(set.toggle(new Set(['a', 'b', 'c']), 'b')).toEqual(
    new Set(['a', 'c'])
  );
});

it('should add item when toggling missing value', () => {
  expect(set.toggle(new Set(['a', 'b', 'c']), 'd')).toEqual(
    new Set(['a', 'b', 'c', 'd'])
  );
});

it('does not perform value equality when including', () => {
  expect(set.include(new Set([{}]), {})).toEqual(new Set([{}, {}]));
  expect(set.include(new Set([[1, 2]]), [1, 2])).toEqual(
    new Set([
      [1, 2],
      [1, 2],
    ])
  );

  const o = {};
  const so = new Set([o]);
  expect(set.include(so, o)).toBe(so);

  const l = [true, false];
  const sl = new Set([l]);
  expect(set.include(sl, l)).toBe(sl);
});

it('does not perform value equality when excluding', () => {
  const s1 = new Set([{}]);
  expect(set.exclude(s1, {})).toBe(s1);

  const s2 = new Set([[1, 2]]);
  expect(set.exclude(s2, [1, 2])).toBe(s2);

  const o = {};
  expect(set.exclude(new Set([o]), o)).toEqual(new Set());

  const l = [true, false];
  expect(set.exclude(new Set([l]), l)).toEqual(new Set());
});
