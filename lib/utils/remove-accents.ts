/**
 * Returns a string with accents stripped
 *
 * @param {String} inputString string for which to remove accents
 * @returns {String} string with accents removed
 */
const removeAccents = (content: string): string => {
  return content.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export default removeAccents;
