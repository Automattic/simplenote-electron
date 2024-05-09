import * as T from '../types';
import { TKQItem, TracksAPI } from './types';

declare const TRACKS_COOKIE_DOMAIN: string | undefined;

type Query = Partial<{
  _dl: string;
  _dr: string;
  _en: string;
  _ht: number;
  _lg: string;
  _pf: string;
  _sx: number;
  _sy: number;
  _ts: number;
  _tz: number;
  _ui: string | null;
  _ul: string;
  _ut: string;
  _wd: number;
  anonId: string;
}>;

window._tkq = window._tkq || [];
window.wpcom = window.wpcom || { tracks: buildTracks() };
window.wpcom.tracks = window.wpcom.tracks || buildTracks();

function buildTracks() {
  let userId: string | null | undefined;
  let userIdType: string;
  let userLogin: string | null | undefined;
  const localCache: { [key: string]: string } = {};
  let context = {};
  const pixel = 'https://pixel.wp.com/t.gif';
  let cookieDomain: string | null = null;
  const cookiePrefix = 'tk_';
  const testCookie = 'tc';
  const userNameCookie = 'ni';
  const userAnonCookie = 'ai';
  const queriesCookie = 'qs';
  const queriesTTL = 1800;
  const queriesPending: { [key: string]: boolean } = {};

  const getCookie = function (key: string) {
    const name = `${cookiePrefix}${encodeURIComponent(key).replace(
      /[-.+*]/g,
      '\\$&'
    )}`;
    const pattern = new RegExp(
      `(?:(?:^|.*;)\\s*${name}\\s*\\=\\s*([^;]*).*$)|^.*$`
    );
    return decodeURIComponent(document.cookie.replace(pattern, '$1')) || null;
  };

  const checkCookieDomain = function (domain: string) {
    const time = new Date().getTime();
    document.cookie = `${cookiePrefix}${testCookie}=${time}; domain=${domain}; path=/;`;
    // @ts-ignore
    return getCookie(testCookie) === time;
  };

  const getCookieDomain = function () {
    if (cookieDomain === null) {
      cookieDomain = '';
      const host = document.location.host.toLowerCase().split(':')[0];
      const tokens = host.split('.');
      let tryDomain: string;
      if (typeof TRACKS_COOKIE_DOMAIN !== 'undefined') {
        cookieDomain = TRACKS_COOKIE_DOMAIN; // eslint-disable-line no-undef
      } else {
        for (let i = 1; i <= tokens.length; ++i) {
          tryDomain = '.' + tokens.slice(-i).join('.');
          if (checkCookieDomain(tryDomain)) {
            cookieDomain = tryDomain;
            break;
          }
        }
      }
      if (cookieDomain !== '') {
        cookieDomain = '; domain=' + cookieDomain;
      }
    }
    return cookieDomain;
  };

  // Set a first-party cookie (same domain only, default 5 years)
  const setCookie = function (key: string, value: string, seconds = 15768e4) {
    const name = cookiePrefix + encodeURIComponent(key);
    const date = new Date();
    date.setTime(date.getTime() + seconds * 1e3);
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      getCookieDomain() +
      '; path=/; expires=' +
      date.toUTCString();
  };

  const get = function (key: string) {
    return getCookie(key) || localCache[key];
  };

  const set = function (key: string, value: string, ttl?: number) {
    localCache[key] = value;
    setCookie(key, value, ttl);
  };

  const loadWpcomIdentity = function () {
    const wpcomCookie =
      getCookie('wordpress') ||
      getCookie('wordpress_sec') ||
      getCookie('wordpress_loggedin');
    if (wpcomCookie) {
      return get(userNameCookie);
    }
  };

  const newAnonId = function () {
    const randomBytesLength = 18; // 18 * 4/3 = 24
    let randomBytes: number[] | Uint8Array = [];

    if (window.crypto && window.crypto.getRandomValues) {
      randomBytes = new Uint8Array(randomBytesLength);
      window.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < randomBytesLength; ++i) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    // eslint-disable-next-line
    return btoa(String.fromCharCode.apply(String, randomBytes as number[]));
  };

  const loadIdentity = function () {
    if (userId) {
      return;
    }
    userId = loadWpcomIdentity();
    if (userId) {
      userIdType = 'wpcom:user_id';
    } else {
      userIdType = 'anon';
      userId = get(userAnonCookie);
      if (!userId) {
        userId = newAnonId();
        set(userAnonCookie, userId);
      }
    }
  };

  const getQueries = function () {
    const queries = get(queriesCookie);
    return queries ? queries.split(' ') : [];
  };

  const bot = function () {
    // https://github.com/tobie/ua-parser/blob/master/regexes.yaml
    return !!navigator.userAgent.match(
      /bingbot|bot|borg|google(^tv)|yahoo|slurp|msnbot|msrbot|openbot|archiver|netresearch|lycos|scooter|altavista|teoma|gigabot|baiduspider|blitzbot|oegp|charlotte|furlbot|http%20client|polybot|htdig|ichiro|mogimogi|larbin|pompos|scrubby|searchsight|seekbot|semanticdiscovery|silk|snappy|speedy|spider|voila|vortex|voyager|zao|zeal|fast-webcrawler|converacrawler|dataparksearch|findlinks|crawler|Netvibes|Sogou Pic Spider|ICC-Crawler|Innovazion Crawler|Daumoa|EtaoSpider|A6-Indexer|YisouSpider|Riddler|DBot|wsr-agent|Xenu|SeznamBot|PaperLiBot|SputnikBot|CCBot|ProoXiBot|Scrapy|Genieo|Screaming Frog|YahooCacheSystem|CiBra|Nutch/
    );
  };

  const saveQueries = function (queries: string[]) {
    while (queries.join(' ').length > 2048) {
      queries = queries.slice(1);
    }
    set(queriesCookie, queries.join(' '), queriesTTL);
  };

  const removeQuery = function (query: string) {
    const toSave = [];
    const queries = getQueries();
    for (let i = 0; i < queries.length; ++i) {
      if (query !== queries[i]) {
        toSave.push(queries[i]);
      }
    }
    saveQueries(toSave);
  };

  const saveQuery = function (query: string) {
    removeQuery(query);
    const queries = getQueries();
    queries.push(query);
    saveQueries(queries);
  };

  const getPixel = function (query: string) {
    if (!bot()) {
      if (query in queriesPending) {
        return;
      }
      queriesPending[query] = true;
      const img = new Image();
      saveQuery(query);
      // @TODO: should we be using a data-attribute here? or save `img` in the pending map?
      (img as HTMLImageElement & { query: string }).query = query;
      img.onload = function () {
        delete queriesPending[query];
        if (img) {
          removeQuery((img as HTMLImageElement & { query: string }).query);
        }
      };
      // Add request timestamp just before the request
      img.src = pixel + '?' + query + '&_rt=' + new Date().getTime() + '&_=_';
    }
  };

  const retryQueries = function () {
    getQueries().forEach(getPixel);
  };

  // Deep copy, optionally into another object
  const clone = function (obj: any, target?: any) {
    if (obj === null || 'object' !== typeof obj) return obj;
    if (target === null || 'object' !== typeof target)
      target = obj.constructor();
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        (target as any)[key] = clone(obj[key]);
      }
    }
    return target;
  };

  const serialize = function (obj: Query) {
    const str = [];
    for (const p in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, p)) {
        str.push(
          encodeURIComponent(p) + '=' + encodeURIComponent((obj as any)[p])
        );
      }
    }
    return str.join('&');
  };

  const send = function (query: Query) {
    loadIdentity();
    retryQueries();
    query._ui = userId;
    query._ut = userIdType;
    if (userLogin) {
      query._ul = userLogin;
    }
    const date = new Date();
    query._ts = date.getTime();
    query._tz = date.getTimezoneOffset() / 60;

    const nav = window.navigator;
    const screen = window.screen;
    query._lg = nav.language;
    query._pf = nav.platform;
    query._ht = screen.height;
    query._wd = screen.width;

    const sx =
      window.pageXOffset !== undefined
        ? window.pageXOffset
        : (
            (document.documentElement ||
              document.body.parentNode ||
              document.body) as HTMLElement
          ).scrollLeft;

    const sy =
      window.pageYOffset !== undefined
        ? window.pageYOffset
        : (
            (document.documentElement ||
              document.body.parentNode ||
              document.body) as HTMLElement
          ).scrollTop;

    query._sx = sx !== undefined ? sx : 0;
    query._sy = sy !== undefined ? sy : 0;

    if (document.location !== undefined) {
      query._dl = document.location.toString();
    }
    if (document.referrer !== undefined) {
      query._dr = document.referrer;
    }

    clone(context, query);
    getPixel(serialize(query));
  };

  const recordEvent = function (
    eventName: string,
    eventProps: T.JSONSerializable
  ) {
    if ('_setProperties' === eventName) {
      return;
    }

    eventProps = eventProps || {};
    eventProps._en = eventName;

    send(eventProps);
  };

  const identifyUser = function (newUserId: string, newUserLogin: string) {
    if (newUserLogin) {
      userLogin = newUserLogin;
    }

    if (
      '0' === newUserId ||
      '' === newUserId ||
      null === newUserId ||
      userId === newUserId
    ) {
      return;
    }

    userId = newUserId;
    userIdType = 'wpcom:user_id';
    set(userNameCookie, userId);
    const anonId = get(userAnonCookie);
    if (anonId) {
      send({
        _en: '_aliasUser',
        anonId: anonId,
      });
    }
    set(userAnonCookie, '', -1);
  };

  const clearIdentity = function () {
    userId = null;
    userLogin = null;
    set(userNameCookie, '', -1);
    set(userAnonCookie, '', -1);
    loadIdentity();
  };

  const setProperties = function (properties: Query) {
    properties._en = '_setProperties';

    send(properties);
  };

  const storeContext = function (c: object) {
    if ('object' !== typeof c) {
      return;
    }
    context = c;
  };

  const API: TracksAPI = {
    storeContext: storeContext,
    identifyUser: identifyUser,
    recordEvent: recordEvent,
    setProperties: setProperties,
    clearIdentity: clearIdentity,
  };

  // <3 KM
  const TKQ = function (q: TKQItem[]) {
    // @ts-ignore
    this.a = 1;
    if (q && q.length) {
      for (let i = 0; i < q.length; i++) {
        // @ts-ignore
        this.push(q[i]);
      }
    }
  };

  const initQueue = function () {
    if (!(window._tkq as any).a) {
      retryQueries();
      // @ts-ignore
      window._tkq = new TKQ(window._tkq);
    }
  };

  TKQ.prototype.push = function (args: TKQItem) {
    if (args) {
      if ('object' === typeof args && args.length) {
        const cmd = args.splice(0, 1);
        // @ts-ignore
        if (API[cmd]) API[cmd].apply(null, args);
      } else if ('function' === typeof args) {
        args();
      }
    }
  };

  initQueue();

  return API;
}
