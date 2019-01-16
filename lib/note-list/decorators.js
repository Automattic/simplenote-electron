import React from 'react';

/**
 * Splits a text segment by a RegExp and indicates which pieces are matches
 *
 * This is a recursive function and therefore inherently carries with it the
 * risk of stack overflow. However, we can reasonably guard against this because
 * our level of recursion should be practically limited by the length of the
 * notes and the frequency of search terms.
 *
 * Nonetheless we will hard limit it just in case.
 *
 * @param {RegExp} filter used to split the text
 * @param {Number} sliceLength length of original search text
 * @param {String} text text to split
 * @param {(Object<String, String>)[]} [splits=[]] list of split segments
 * @param {Number} [maxDepth=1000] limits the number of matches and prevents stack overflow on recursion
 * @returns {(Object<String, String>)[]} split segments with type indications
 */
export const splitWith = (
  filter,
  sliceLength,
  text,
  splits = [],
  maxDepth = 1000
) => {
  // prevent splitting a string when the filter is empty
  // because this could easily cause stack-overflow
  if (!sliceLength || !maxDepth) {
    return [...splits, { type: 'text', text }];
  }

  const index = text.search(filter);

  return index === -1
    ? [...splits, { type: 'text', text }]
    : splitWith(
        filter, // pass along the original filter
        sliceLength, // and the original slice length
        text.slice(index + sliceLength), // text _following_ the match
        [
          ...splits, // the existing segments
          { type: 'text', text: text.slice(0, index) }, // text _before_ the match
          { type: 'match', text: text.slice(index, index + sliceLength) }, // the match itself
        ],
        maxDepth - 1 // prevent stack overflow on recursion
      );
};

/**
 * Wraps "match" segments with appropriate CSS
 *
 * @param {String[]} splits segments of split text with type indication
 * @returns {Object[]} the wrapped segments
 */
export const matchify = splits =>
  splits.map(
    ({ type, text }, index) =>
      type === 'match' ? (
        <span key={index} className="search-match">
          {text}
        </span>
      ) : (
        <span key={index}>{text}</span>
      )
  );
