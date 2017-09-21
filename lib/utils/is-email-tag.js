/**
 * @module utils/is-email-tag
 */

/**
 * Naively matches what might appear to be an email address
 *
 * This is not spec-compliant but it does not need to
 * be. Users of the app should assume that any tag
 * name which has the general appearance of a valid
 * email address will be treated as if they are actual
 * email addresses and will be used for adding people
 * to a note as collaborators.
 *
 * Three main components are required:
 *   1. Mailbox piece _before_ the `@`
 *   2. `@`
 *   3. Host and domain piece ending in `[some host].[some TLD]`
 *
 * @type {RegExp}
 */
const naiveEmailPattern = /^(?:[^@]+)@(?:.+)(?:\.[^.]{2,})$/;

/**
 * Indicates if a given tag name string
 * represents an email for collaboration
 *
 * @param {String} tagName name of tag which might be an email address
 * @returns {Boolean} whether or not the tag is considered an email address
 */
export const isEmailTag = tagName => naiveEmailPattern.test(tagName);

export default isEmailTag;
