import { filterTags } from './';

import { EntityId as E, Tag as T } from '../types';

const t = (name: string) => ({ name });
const M = (names: string[]) =>
  new Map<E, T>(names.map((name) => [name, t(name)]));
const animals: Map<E, T> = M(['bat', 'cat', 'dog', 'owl']);
const prefixen: Map<E, T> = M(['do', 'doo', 'door', 'doort', 'doorth']);
const infixen: Map<E, T> = M(['unicode', 'sourcecode', 'codewars']);
const taggers: Map<E, T> = M(['atag', 'atag:what?', 'tag']);

it('only filters if given a query', () => {
  const tags = M(['a', 'b']);

  expect(filterTags(tags, '')).toEqual([]);
  expect(filterTags(tags, ' \t ')).toEqual([]);
  expect(filterTags(tags, '    ')).toEqual([]);
});

it.each([...animals.keys()])('finds full-tag matches', (animal) => {
  expect(filterTags(animals, animal)).toEqual([animal]);
});

it('finds all prefix-matching tags', () => {
  expect(filterTags(prefixen, 'd')).toEqual([...prefixen.keys()]);
  expect(filterTags(prefixen, 'do')).toEqual([...prefixen.keys()]);
  expect(filterTags(prefixen, 'doo')).toEqual([...prefixen.keys()].slice(1));
  expect(filterTags(prefixen, 'door')).toEqual([...prefixen.keys()].slice(2));
  expect(filterTags(prefixen, 'doort')).toEqual([...prefixen.keys()].slice(3));
});

it('finds mid-tag matches', () => {
  // all but the first prefixen has a double-oo
  expect(filterTags(prefixen, 'oo')).toEqual([...prefixen.keys()].slice(1));
  expect(filterTags(animals, 'at')).toEqual(['bat', 'cat']);
  expect(filterTags(infixen, 'rce')).toEqual(['sourcecode']);
  expect(filterTags(infixen, 'code')).toEqual([...infixen.keys()]);
});

it('finds case insensitive matches', () => {
  expect(filterTags(animals, 'Cat')).toEqual(['cat']);
  expect(filterTags(animals, 'OWL')).toEqual(['owl']);
});

it('uses the last space-separated segment in the query for search', () => {
  expect(filterTags(infixen, 'code bug')).toEqual([]);
  expect(filterTags(infixen, 'bug code')).toEqual([...infixen.keys()]);
  expect(filterTags(animals, 'bat cat dog owl')).toEqual(['owl']);
  expect(filterTags(animals, 'bat owl dog cat')).toEqual(['cat']);
});

it('returns at-most five results', () => {
  expect(
    filterTags(
      new Map([
        ...infixen.entries(),
        ...animals.entries(),
        ...prefixen.entries(),
      ]),
      'd'
    )
  ).toHaveLength(5);
});

it.each([...animals.keys()])(
  'ignores full matches with the tag: prefix',
  (animal) => {
    expect(filterTags(animals, `tag:${animal}`)).toEqual([]);
  }
);

it('ignores full matches with the tag: prefix (round 2)', () => {
  expect(filterTags(infixen, 'tag:sourcecod')).toEqual(['sourcecode']);
  expect(filterTags(infixen, 'tag:sourcecode')).toEqual([]);
});

it('matches with the tag: prefix (only prefixes)', () => {
  expect(filterTags(animals, 'tag:ba')).toEqual(['bat']);
  expect(filterTags(prefixen, 'tag:door')).toEqual(['doort', 'doorth']);
  expect(filterTags(prefixen, 'tag:oor')).toEqual([]);
  expect(filterTags(infixen, 'tag:code')).toEqual(['codewars']);
});

it('falls-back to plain text matching if the tag: prefix is incomplete', () => {
  expect(filterTags(animals, 't')).toEqual(['bat', 'cat']);
  expect(filterTags(animals, 'ta')).toEqual([]);
  expect(filterTags(animals, 'tag')).toEqual([]);
  expect(filterTags(animals, 'tag:')).toEqual([]);

  expect(filterTags(taggers, 't')).toEqual([...taggers.keys()]);
  expect(filterTags(taggers, 'ta')).toEqual([...taggers.keys()]);
  expect(filterTags(taggers, 'tag')).toEqual([...taggers.keys()]);
  expect(filterTags(taggers, 'tag:')).toEqual(['atag:what?']);
});
