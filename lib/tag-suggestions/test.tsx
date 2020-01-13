import { filterTags } from './';

import { TagEntity as T } from '../types';

const t = (name: string) => ({ id: name, data: { name }, version: 1 });
const animals: T[] = ['bat', 'cat', 'dog', 'owl'].map(t);
const prefixen: T[] = ['do', 'doo', 'door', 'doort', 'doorth'].map(t);
const infixen: T[] = ['unicode', 'sourcecode', 'codewars'].map(t);
const taggers: T[] = ['atag', 'atag:what?', 'tag'].map(t);

it('only filters if given a query', () => {
  const tags = ['a', 'b'].map(t);

  expect(filterTags(tags, '')).toBe(tags);
  expect(filterTags(tags, ' \t ')).toBe(tags);
  expect(filterTags(tags, '    ')).toBe(tags);
});

it.each(animals)('finds full-tag matches', animal => {
  expect(filterTags(animals, animal.data.name)).toEqual([animal]);
});

it('finds all prefix-matching tags', () => {
  expect(filterTags(prefixen, 'd')).toEqual(prefixen);
  expect(filterTags(prefixen, 'do')).toEqual(prefixen);
  expect(filterTags(prefixen, 'doo')).toEqual(prefixen.slice(1));
  expect(filterTags(prefixen, 'door')).toEqual(prefixen.slice(2));
  expect(filterTags(prefixen, 'doort')).toEqual(prefixen.slice(3));
});

it('finds mid-tag matches', () => {
  // all but the first prefixen has a double-oo
  expect(filterTags(prefixen, 'oo')).toEqual(prefixen.slice(1));
  expect(filterTags(animals, 'at')).toEqual(['bat', 'cat'].map(t));
  expect(filterTags(infixen, 'rce')).toEqual(['sourcecode'].map(t));
  expect(filterTags(infixen, 'code')).toEqual(infixen);
});

it('uses the last space-separated segment in the query for search', () => {
  expect(filterTags(infixen, 'code bug')).toEqual([]);
  expect(filterTags(infixen, 'bug code')).toEqual(infixen);
  expect(filterTags(animals, 'bat cat dog owl')).toEqual(['owl'].map(t));
  expect(filterTags(animals, 'bat owl dog cat')).toEqual(['cat'].map(t));
});

it('returns at-most five results', () => {
  expect(filterTags([...infixen, ...infixen, ...infixen], 'd')).toHaveLength(5);
});

it.each(animals)('ignores full matches with the tag: prefix', animal => {
  expect(filterTags(animals, `tag:${animal.data.name}`)).toEqual([]);
});

it('ignores full matches with the tag: prefix (round 2)', () => {
  expect(filterTags(infixen, 'tag:sourcecod')).toEqual(['sourcecode'].map(t));
  expect(filterTags(infixen, 'tag:sourcecode')).toEqual([]);
});

it('matches with the tag: prefix (only prefixes)', () => {
  expect(filterTags(animals, 'tag:ba')).toEqual(['bat'].map(t));
  expect(filterTags(prefixen, 'tag:door')).toEqual(['doort', 'doorth'].map(t));
  expect(filterTags(prefixen, 'tag:oor')).toEqual([]);
  expect(filterTags(infixen, 'tag:code')).toEqual(['codewars'].map(t));
});

it('falls-back to plain text matching if the tag: prefix is incomplete', () => {
  expect(filterTags(animals, 't')).toEqual(['bat', 'cat'].map(t));
  expect(filterTags(animals, 'ta')).toEqual([]);
  expect(filterTags(animals, 'tag')).toEqual([]);
  expect(filterTags(animals, 'tag:')).toEqual([]);

  expect(filterTags(taggers, 't')).toEqual(taggers);
  expect(filterTags(taggers, 'ta')).toEqual(taggers);
  expect(filterTags(taggers, 'tag')).toEqual(taggers);
  expect(filterTags(taggers, 'tag:')).toEqual(['atag:what?'].map(t));
});
