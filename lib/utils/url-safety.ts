import isemail from 'isemail';

const safeSimplenoteLink = /^simplenote:\/\/note\/[a-zA-Z0-9-]+$/;

const ipv4Parts = (hostname: string): number[] | null => {
  const parts = hostname.split('.');

  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));

  return numbers.every((part) => part >= 0 && part <= 255) ? numbers : null;
};

const isPrivateOrLocalIpv4 = (hostname: string): boolean => {
  const parts = ipv4Parts(hostname);

  if (!parts) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

const isPrivateOrLocalIpv6 = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1];

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    normalized.startsWith('::ffff:') ||
    normalized.startsWith('fe80:') ||
    /^f[cd][0-9a-f]{2}:/.test(normalized) ||
    (mappedIpv4 ? isPrivateOrLocalIpv4(mappedIpv4) : false)
  );
};

export const isLocalOrPrivateHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    isPrivateOrLocalIpv4(normalized) ||
    isPrivateOrLocalIpv6(normalized)
  );
};

export const normalizeSafeLinkHref = (href: string | null): string | null => {
  if (!href) {
    return null;
  }

  const trimmed = href.trim();

  if (safeSimplenoteLink.test(trimmed)) {
    return trimmed;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed;
  }

  return 'https://' + trimmed;
};

export const normalizeSafeImageSrc = (src: string | null): string | null => {
  if (!src) {
    return null;
  }

  try {
    const url = new URL(src.trim());

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      isLocalOrPrivateHostname(url.hostname)
    ) {
      return null;
    }

    return url.href;
  } catch (e) {
    return null;
  }
};

export const isSameDocumentLink = (
  href: string,
  currentHref: string = window.location.href
): boolean => {
  try {
    const url = new URL(href, currentHref);
    const current = new URL(currentHref);

    return (
      !!url.hash &&
      url.origin === current.origin &&
      url.pathname === current.pathname &&
      url.search === current.search
    );
  } catch (e) {
    return false;
  }
};
