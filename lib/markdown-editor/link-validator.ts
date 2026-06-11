import { normalizeSafeLinkHref } from '../utils/url-safety';

const simplenoteNoteLink = /^simplenote:\/\/note\/[a-zA-Z0-9-]+$/;

export const isAllowedLinkHref = (href: string) =>
  simplenoteNoteLink.test(href) || !!normalizeSafeLinkHref(href);

export const normalizeLinkHref = (href: string): string | null => {
  if (simplenoteNoteLink.test(href)) {
    return href;
  }

  return normalizeSafeLinkHref(href);
};

// Requires an alphabetic TLD so version-like strings ("v1.2") don't match.
const bareDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}([/?#]\S*)?$/i;

/**
 * Returns a URL when the given text plausibly is one, or null otherwise.
 * Unlike normalizeLinkHref this does not coerce arbitrary text into a URL;
 * it is meant for detecting URLs, e.g. in a selection.
 */
export const urlFromText = (text: string): string | null => {
  const trimmed = text.trim();

  if (!trimmed || /\s/.test(trimmed)) {
    return null;
  }

  if (simplenoteNoteLink.test(trimmed)) {
    return trimmed;
  }

  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  return bareDomain.test(trimmed) ? `https://${trimmed}` : null;
};
