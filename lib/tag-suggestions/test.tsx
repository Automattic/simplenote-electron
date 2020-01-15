import { filterTags } from './';

import { TagEntity as T } from '../types';

const t = (name: string) => ({ id: name, data: { name }, version: 1 });
const animals: T[] = ['bat', 'cat', 'dog', 'owl'].map(t);
const prefixen: T[] = ['do', 'doo', 'door', 'doort', 'doorth'].map(t);
const infixen: T[] = ['unicode', 'sourcecode', 'codewars'].map(t);
const taggers: T[] = ['atag', 'atag:what?', 'tag'].map(t);

it('returns an empty result for an empty query', () => {
  const tags = ['a', 'b'].map(t);

  expect(filterTags('', [], tags)).toEqual([]);
  expect(filterTags(' \t ', [], tags)).toEqual([]);
  expect(filterTags('    ', [], tags)).toEqual([]);
});

it.each(animals)('finds full-tag matches', animal => {
  expect(filterTags(animal.data.name, [], animals)).toEqual([animal]);
});

it('finds all prefix-matching tags', () => {
  expect(filterTags('d', [], prefixen)).toEqual(prefixen);
  expect(filterTags('do', [], prefixen)).toEqual(prefixen);
  expect(filterTags('doo', [], prefixen)).toEqual(prefixen.slice(1));
  expect(filterTags('door', [], prefixen)).toEqual(prefixen.slice(2));
  expect(filterTags('doort', [], prefixen)).toEqual(prefixen.slice(3));
});

it('finds mid-tag matches', () => {
  // all but the first prefixen has a double-oo
  expect(filterTags('oo', [], prefixen)).toEqual(prefixen.slice(1));
  expect(filterTags('at', [], animals)).toEqual(['bat', 'cat'].map(t));
  expect(filterTags('rce', [], infixen)).toEqual(['sourcecode'].map(t));
  expect(filterTags('code', [], infixen)).toEqual(infixen);
});

it('uses the last space-separated segment in the query for search', () => {
  expect(filterTags('code bug', [], infixen)).toEqual([]);
  expect(filterTags('bug code', [], infixen)).toEqual(infixen);
  expect(filterTags('bat cat dog owl', [], animals)).toEqual(['owl'].map(t));
  expect(filterTags('bat owl dog cat', [], animals)).toEqual(['cat'].map(t));
});

it('returns at-most five results', () => {
  expect(
    filterTags('d', [], [...infixen, ...infixen, ...infixen])
  ).toHaveLength(5);
});

it.each(animals)('ignores full matches with the tag: prefix', animal => {
  expect(filterTags(`tag:${animal.data.name}`, [], animals)).toEqual([]);
});

it('ignores full matches with the tag: prefix (round 2)', () => {
  expect(filterTags('tag:sourcecod', [], infixen)).toEqual(
    ['sourcecode'].map(t)
  );
  expect(filterTags('tag:sourcecode', [], infixen)).toEqual([]);
});

it('matches with the tag: prefix (only prefixes)', () => {
  expect(filterTags('tag:ba', [], animals)).toEqual(['bat'].map(t));
  expect(filterTags('tag:door', [], prefixen)).toEqual(
    ['doort', 'doorth'].map(t)
  );
  expect(filterTags('tag:oor', [], prefixen)).toEqual([]);
  expect(filterTags('tag:code', [], infixen)).toEqual(['codewars'].map(t));
});

it('falls-back to plain text matching if the tag: prefix is incomplete', () => {
  expect(filterTags('t', [], animals)).toEqual(['bat', 'cat'].map(t));
  expect(filterTags('ta', [], animals)).toEqual([]);
  expect(filterTags('tag', [], animals)).toEqual([]);
  expect(filterTags('tag:', [], animals)).toEqual([]);

  expect(filterTags('t', [], taggers)).toEqual(taggers);
  expect(filterTags('ta', [], taggers)).toEqual(taggers);
  expect(filterTags('tag', [], taggers)).toEqual(taggers);
  expect(filterTags('tag:', [], taggers)).toEqual(['atag:what?'].map(t));
});
