import { filterTags } from './';
import { tagHashOf as th } from '../utils/tag-hash';

import { TagHash as E, TagName as TN, Tag as T } from '../types';

const t = (name: TN) => ({ name });
const M = (names: TN[]) =>
  new Map<E, T>(names.map((name) => [th(name), t(name)]));
const animals: Map<E, T> = M(['bat', 'cat', 'dog', 'owl'] as TN[]);
const prefixen: Map<E, T> = M(['do', 'doo', 'door', 'doort', 'doorth'] as TN[]);
const infixen: Map<E, T> = M(['unicode', 'sourcecode', 'codewars'] as TN[]);
const taggers: Map<E, T> = M(['atag', 'atag:what?', 'tag'] as TN[]);

it('only filters if given a query', () => {
  const tags = M(['a', 'b'] as TN[]);

  expect(filterTags(tags, new Map(), '')).toEqual([]);
  expect(filterTags(tags, new Map(), ' \t ')).toEqual([]);
  expect(filterTags(tags, new Map(), '    ')).toEqual([]);
});

it.each([...animals.keys()])('finds full-tag matches', (animal) => {
  expect(filterTags(animals, new Map(), animal)).toEqual([animal]);
});

it('finds all prefix-matching tags', () => {
  expect(filterTags(prefixen, new Map(), 'd')).toEqual([...prefixen.keys()]);
  expect(filterTags(prefixen, new Map(), 'do')).toEqual([...prefixen.keys()]);
  expect(filterTags(prefixen, new Map(), 'doo')).toEqual(
    [...prefixen.keys()].slice(1)
  );
  expect(filterTags(prefixen, new Map(), 'door')).toEqual(
    [...prefixen.keys()].slice(2)
  );
  expect(filterTags(prefixen, new Map(), 'doort')).toEqual(
    [...prefixen.keys()].slice(3)
  );
});

it('finds mid-tag matches', () => {
  // all but the first prefixen has a double-oo
  expect(filterTags(prefixen, new Map(), 'oo')).toEqual(
    [...prefixen.keys()].slice(1)
  );
  expect(filterTags(animals, new Map(), 'at')).toEqual(['bat', 'cat']);
  expect(filterTags(infixen, new Map(), 'rce')).toEqual(['sourcecode']);
  expect(filterTags(infixen, new Map(), 'code')).toEqual(
    [...infixen.keys()].sort((a, b) => a.localeCompare(b))
  );
});

it('finds case insensitive matches', () => {
  expect(filterTags(animals, new Map(), 'Cat')).toEqual(['cat']);
  expect(filterTags(animals, new Map(), 'OWL')).toEqual(['owl']);
});

it('uses the last space-separated segment in the query for search', () => {
  expect(filterTags(infixen, new Map(), 'code bug')).toEqual([]);
  expect(filterTags(infixen, new Map(), 'bug code')).toEqual(
    [...infixen.keys()].sort((a, b) => a.localeCompare(b))
  );
  expect(filterTags(animals, new Map(), 'bat cat dog owl')).toEqual(['owl']);
  expect(filterTags(animals, new Map(), 'bat owl dog cat')).toEqual(['cat']);
});

it('returns at-most five results', () => {
  expect(
    filterTags(
      new Map([
        ...infixen.entries(),
        ...animals.entries(),
        ...prefixen.entries(),
      ]),
      new Map(),
      'd'
    )
  ).toHaveLength(5);
});

it.each([...animals.keys()])(
  'ignores full matches with the tag: prefix',
  (animal) => {
    expect(filterTags(animals, new Map(), `tag:${animal}`)).toEqual([]);
  }
);

it('ignores full matches with the tag: prefix (round 2)', () => {
  expect(filterTags(infixen, new Map(), 'tag:sourcecod')).toEqual([
    'sourcecode',
  ]);
  expect(filterTags(infixen, new Map(), 'tag:sourcecode')).toEqual([]);
});

it('matches with the tag: prefix (only prefixes)', () => {
  expect(filterTags(animals, new Map(), 'tag:ba')).toEqual(['bat']);
  expect(filterTags(prefixen, new Map(), 'tag:door')).toEqual([
    'doort',
    'doorth',
  ]);
  expect(filterTags(prefixen, new Map(), 'tag:oor')).toEqual([]);
  expect(filterTags(infixen, new Map(), 'tag:code')).toEqual(['codewars']);
});

it('falls-back to plain text matching if the tag: prefix is incomplete', () => {
  expect(filterTags(animals, new Map(), 't')).toEqual([
    'bat',
    'cat',
    'untagged',
  ]);
  expect(filterTags(animals, new Map(), 'ta')).toEqual(['untagged']);
  expect(filterTags(animals, new Map(), 'tag')).toEqual(['untagged']);
  expect(filterTags(animals, new Map(), 'tag:')).toEqual([]);
  expect(filterTags(animals, new Map(), 'do')).toEqual(['dog']);
  expect(filterTags(animals, new Map(), 'dot')).toEqual([]);

  // matching first-letter takes precedence over lexical sort
  expect(filterTags(taggers, new Map(), 't')).toEqual(
    ['tag', 'atag', 'atag:what?', 'untagged'].map(th)
  );
  expect(filterTags(taggers, new Map(), 'ta')).toEqual(
    ['tag', 'atag', 'atag:what?', 'untagged'].map(th)
  );
  expect(filterTags(taggers, new Map(), 'tag')).toEqual(
    ['tag', 'atag', 'atag:what?', 'untagged'].map(th)
  );
  expect(filterTags(taggers, new Map(), 'tag:')).toEqual(
    ['atag:what?'].map(th)
  );
});
