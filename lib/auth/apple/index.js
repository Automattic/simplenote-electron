/*eslint-disable */
/**
 * Copyright (c) 2019 Apple Inc. All rights reserved.
 *
 * # Sign In with Apple License
 *
 * **IMPORTANT:** This Sign In with Apple software is supplied to you by Apple Inc. ("Apple") in consideration of your agreement to the following terms, and your use, reproduction, or installation of this Apple software constitutes acceptance of these terms. If you do not agree with these terms, please do not use, reproduce or install this Apple software.
 *
 * This software is licensed to you only for use with Sign In with Apple that you are authorized or legally permitted to embed or display on your website.
 *
 * The Sign In with Apple software is only licensed and intended for the purposes set forth above and may not be used for other purposes or in other contexts without Apple's prior written permission. For the sake of clarity, you may not and agree not to or enable others to, modify or create derivative works of the Sign In with Apple software.
 *
 * You may only use the Sign In with Apple software if you are enrolled in the Apple Developer Program.
 *
 * Neither the name, trademarks, service marks or logos of Apple Inc. may be used to endorse or promote products, services without specific prior written permission from Apple. Except as expressly stated in this notice, no other rights or licenses, express or implied, are granted by Apple herein.
 *
 * The Sign In with Apple software software is provided by Apple on an "AS IS" basis. APPLE MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION THE IMPLIED WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE, REGARDING THE SIGN IN WITH APPLE SOFTWARE OR ITS USE AND OPERATION ALONE OR IN COMBINATION WITH YOUR PRODUCTS, SYSTEMS, OR SERVICES.  APPLE DOES NOT WARRANT THAT THE SIGN IN WITH APPLE SOFTWARE WILL MEET YOUR REQUIREMENTS, THAT THE OPERATION OF THE SIGN IN WITH APPLE SOFTWARE WILL BE UNINTERRUPTED OR ERROR-FREE, THAT DEFECTS IN THE SIGN IN WITH APPLE SOFTWARE WILL BE CORRECTED, OR THAT THE SIGN IN WITH APPLE SOFTWARE WILL BE COMPATIBLE WITH FUTURE APPLE PRODUCTS, SOFTWARE OR SERVICES. NO ORAL OR WRITTEN INFORMATION OR ADVICE GIVEN BY APPLE OR AN APPLE AUTHORIZED REPRESENTATIVE WILL CREATE A WARRANTY.
 *
 * IN NO EVENT SHALL APPLE BE LIABLE FOR ANY DIRECT, SPECIAL, INDIRECT, INCIDENTAL OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) RELATING TO OR ARISING IN ANY WAY OUT OF THE USE, REPRODUCTION, OR INSTALLATION, OF THE SIGN IN WITH APPLE SOFTWARE BY YOU OR OTHERS, HOWEVER CAUSED AND WHETHER UNDER THEORY OF CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY OR OTHERWISE, EVEN IF APPLE HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OF LIABILITY FOR PERSONAL INJURY, OR OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO THIS LIMITATION MAY NOT APPLY TO YOU. In no event shall Apple's total liability to you for all damages (other than as may be required by applicable law in cases involving personal injury) exceed the amount of fifty dollars ($50.00). The foregoing limitations will apply even if the above stated remedy fails of its essential purpose.
 *
 * **ACKNOWLEDGEMENTS:**
 * https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/acknowledgements.txt
 *
 * v1.1.6
 */
!(function(A, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? e(exports)
    : 'function' == typeof define && define.amd
    ? define(['exports'], e)
    : e(((A = A || self).AppleID = {}));
})(this, function(A) {
  'use strict';
  const e = {
      'sign-in': {
        text: 'Sign in with Apple',
        boundingBox: { x: 8, y: -6, width: 118.859375, height: 18 },
        fontFamily: 'SF Pro Text',
      },
      continue: {
        text: 'Continue with Apple',
        boundingBox: { x: 8, y: -6, width: 131.84375, height: 18 },
        fontFamily: 'SF Pro Text',
      },
    },
    t = ({ color: A = 'black', type: t = 'sign-in', border: n = !1 }) => {
      const i = e[t],
        B = ((A, t = 'black') => {
          const n = e[A],
            i = n.text,
            B = n.fontFamily;
          return `\n  <svg style="position: relative; top: 25%; pointer-events: none;" xmlns="http://www.w3.org/2000/svg" width="100%" height="50%" viewBox="0 -11.5 ${
            n.boundingBox.width
          } 14" fill="#${
            'black' === t ? 'fff' : '000'
          }">\n  <defs>\n    <style>\n      \n  @font-face {\n    font-family: "SF Pro Text";\n    src: url(data:application/x-font-ttf;charset=utf-8;base64,AAEAAAAKAIAAAwAgT1MvMnVtqhkAAACsAAAAYGNtYXD93kYZAAABDAAAAZpnbHlmLpr9wAAAAqgAAAZAaGVhZBSiHesAAAjoAAAANmhoZWEPdgZnAAAJIAAAACRobXR4VBkIWwAACUQAAABIbG9jYQ8YDZAAAAmMAAAAJm1heHABZwCPAAAJtAAAACBuYW1l/zBG2gAACdQAAAa8cG9zdLarUFQAABCQAAAATgAEBNEB9AAFAAAFMwTMAAAAmQUzBMwAAALMAJoCjQAAAAAGAAAAAAAAACAAAo8QAAAAAAAAAAAAAABBUFBMAAAAIPj/B57+EgAAB54B7iAAAZ8AAAAABEEFowAAACAAAwAAAAMAAAADAAAAHAABAAAAAACUAAMAAQAAABwABAB4AAAAGgAQAAMACgAgACwAQQBDAFMAZQBpAGwAcAB1AHf4////AAAAIAAsAEEAQwBTAGUAZwBsAG4AdAB3+P/////h/+T/wf/A/7H/oP+f/53/nP+Z/5gHEgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAwAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAUABgcIAAAJAAoLDAAAAA0OAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgBk/hIHnAeeAAMABwALAA8AEwAXAAATNSEVATUhFQE1IRUBNSEVATUhFQE1IRVkBzj4yAc4+MgHOPjIBzj4yAc4+MgHOP4S9/cBt/f3Abj39wG39/cBuPf3Abf39wAAAgBGAAAFSQWjAAcACwAAJQMhAyMBMwkBAyEDBFuE/dqF5gIJ8QIJ/XPSAbTRAAF//oEFo/pdBJ39ngJiAAAAAAEAev/dBVwFxgAlAAAFIi4BAjU0Ej4BMzIeAhcjLgIjIg4BFRQeATMyPgE3Mw4DAwWW8apaWqnxlnfPoGQO3xVqm1+CvGdnvYJfnGkU3w9kns0jaMUBGK+vARjGaEmGt25Yg0iG9amo9YZBd1Jrr31EAAAAAQBx/90ExAXGADIAABMzHgIzMj4BNTQmLwEuATU0PgIzMh4CFyMuAiMiDgEVFBYfAR4CFRQOASMiLgFx3glclGFajVGEj7rEuEuLwXZuuopRBdoLUIJUWIVKe42flLhWiPmroPKNAYREZTc5ZEBTaCItLsKfYJ5xPT1umFtCYTU1YUFNYCEnImudbIrKbWi+AAAAAAIAZv/rBEIEVgAIACMAAAEiDgEHIS4CEzMOAiMiLgE1ND4BMzIeAR0BIRUeAjMyNgJbT3tKBgImA0N3vM8XgcN9nOF6e+GamNl1/P8DSYBWYYQDn0Z/VVV/Rv2HYY1NiPyurv+MhParSwxgjExEAAACAGX+YAReBFMADwAzAAAlMj4BNTQuASMiDgEVFB4BEyIuASczHgEzMjY9ASMOASMiLgE1ND4BMzIeARczNTMRFA4BAmRchEdHhFxcgkNDgl+Iy3gM3A6DbYaXEDGucYvKbW7Li0uFZx8RznviylegbWygWFigbGygWP2WTIpdO0d5bNFZXofzo6b3iS9WO677tn22ZAAAAAEApgAABE8F6gAWAAA3ETMRMz4BMzIeARURIxE0JiMiDgEVEabVESipe3SoW9d3clh6QAAF6v2oXGdftoH9QQKKgoRFfVL9hAAAAAACAIMAAAGTBhcAAwATAAA3ETMRAyIuATU0PgEzMh4BFRQOAaDWayU+JSU+JSU+JSU+AARB+78E/iZAJidAJiZAJyZAJgAAAAABAKYAAAF9BeoAAwAANxEzEabXAAXq+hYAAAAAAQCcAAAEOQRWABUAADcRMxUzPgEzMhYVESMRNCYjIg4BFRGczxAoonu2w9d0d091QAAEQa1bZ9PC/T8Ci4ODQ3xV/YMAAAAAAgBm/+sEaQRWAA8AGwAABSIuATU0PgEzMh4BFRQOAScyNjU0JiMiBhUUFgJooOZ8fOefnud8fOafjJiYjIyYmBWI/bGv/oiI/q+x/Yi/xbKxxcWxs8QAAAIAnP6WBJUEUwAUACQAAAEyHgEVFA4BIyImJyMRIxEzFTM+ARMyPgE1NC4BIyIOARUUHgEC0YvKb27LiXSwKxHXzxAxtjJcgkZGgltbg0hHhARTifytrf2JYVb98QWrtF1p/FxZpnNzpVlapnJypVoAAAAAAQA7//oCqwVQABgAABMzETMVIxEUFjMyNjcVDgEjIi4BNREjNTPo1+zsSlAZIhcaOyB4k0OtrQVQ/uy1/dBVTwMCswUGO4JpAme1AAEAkv/rBDIEQQAUAAABESM1Iw4BIyImNREzERQWMzI2NREEMs8RKKV8tcLXb3aCiwRB+7+tXWXTwALD/XWEgJKAAn0AAQBBAAAGJgRBAA8AAAkBIwMjAyMBMxMzEzMTMxMGJv7V3+ER4N3+1NrDEODO4BHCBEH7vwMi/N4EQfzBAz/8wQM/AAABAI7+hwHMANgAAwAAASMTMwEmmF3h/ocCUQAAAgED//AF+gYPADkATgAAATIeAhcOBBUUHgMXFA4BBw4CIyIuAiMiDgIjIi4BJy4CNTQ+AjMyHgIzMj4CJw4CIyInLgE1NDY3PgI3FhUUBgSdEUZZXicDIzIwICk9PSsCFy8lIUhUNSg5Mz8tLUI3OiQxUEsnLUosQ3GLSSdGQDkYFztFUAsaSE8jCwoBAjUhHE1WJwMvBJQHHD85AhkuRl88RmlKLhUBA0FkNzBZOBMYExMaEzZaN0Gpv19yrnU8FBsUFR0VgSAyHQIDEAk9cSYiNCABDRI9cwAAAAEAAAABAADkss/XXw889QABCAAAAAAA1qhxxgAAAADXDWF9ADv+EgecB54AAAADAAIAAAAAAAAAAQAAB57+EgAACAAAOgBCB5wAAQAAAAAAAAAAAAAAAAAAABIIAABjAjAAAAWPAEUFzQB5BTUAcASoAGUE+gBkBOEApQIWAIICIwClBMsAmwTPAGUE+wCbAwwAOgTOAJEGaABAAoUAjQdAAQIAAAAwADAAUACKANQBDAFYAX4BogGwAdQCAAI6AmACggKkArIDIAAAAAEAAAASAE8ABgAAAAAAAgAuAD4AdwAAAKkAAAAAAAAAAAAgAYYAAQAAAAAAAAAsAAAAAQAAAAAAAQALACwAAQAAAAAAAgAGADcAAQAAAAAAAwAoAD0AAQAAAAAABAASAGUAAQAAAAAABQAQAHcAAQAAAAAABgAQAIcAAQAAAAAABwAqAJcAAQAAAAAACAAKAMEAAQAAAAAACQAKAMsAAQAAAAAACgAKANUAAQAAAAAACwAVAN8AAQAAAAAADAAVAPQAAQAAAAAADQCkAQkAAQAAAAAAEAALAa0AAQAAAAAAEQAGAbgAAwABBAkAAABWAb4AAwABBAkAAQAWAhQAAwABBAkAAgAMAioAAwABBAkAAwBQAjYAAwABBAkABAAkAoYAAwABBAkABQAgAqoAAwABBAkABgAgAsoAAwABBAkABwBUAuoAAwABBAkACAAUAz4AAwABBAkACQAUA1IAAwABBAkACgAUA2YAAwABBAkACwAqA3oAAwABBAkADAAqA6QAAwABBAkADQFGA84AAwABBAkAEAAWBRQAAwABBAkAEQAMBSrCqSAyMDE1LTIwMTcgQXBwbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlNGIFBybyBUZXh0TWVkaXVtU0YgUHJvIFRleHQgTWVkaXVtOyAwMi4wZDJlMTsgMjAxOC0wNC0zMFNGIFBybyBUZXh0IE1lZGl1bVZlcnNpb24gMDIuMGQyZTFTRlByb1RleHQtTWVkaXVtU2FuIEZyYW5jaXNjbyBpcyBhIHRyYWRlbWFyayBvZiBBcHBsZSBJbmMuQXBwbGUgSW5jLkFwcGxlIEluYy5BcHBsZSBJbmMuaHR0cDovL3d3dy5hcHBsZS5jb20vaHR0cDovL3d3dy5hcHBsZS5jb20vQ29weXJpZ2h0IMKpIDIwMTUtMjAxNyBBcHBsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuICBZb3VyIHVzZSBvZiB0aGUgU2FuIEZyYW5jaXNjbyBmb250IGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBhcHBsaWNhYmxlIGlPUyBTb2Z0d2FyZSBMaWNlbnNlIEFncmVlbWVudC5TRiBQcm8gVGV4dE1lZGl1bQCpACAAMgAwADEANQAtADIAMAAxADcAIABBAHAAcABsAGUAIABJAG4AYwAuACAAQQBsAGwAIAByAGkAZwBoAHQAcwAgAHIAZQBzAGUAcgB2AGUAZAAuAFMARgAgAFAAcgBvACAAVABlAHgAdABNAGUAZABpAHUAbQBTAEYAIABQAHIAbwAgAFQAZQB4AHQAIABNAGUAZABpAHUAbQA7ACAAMAAyAC4AMABkADIAZQAxADsAIAAyADAAMQA4AC0AMAA0AC0AMwAwAFMARgAgAFAAcgBvACAAVABlAHgAdAAgAE0AZQBkAGkAdQBtAFYAZQByAHMAaQBvAG4AIAAwADIALgAwAGQAMgBlADEAUwBGAFAAcgBvAFQAZQB4AHQALQBNAGUAZABpAHUAbQBTAGEAbgAgAEYAcgBhAG4AYwBpAHMAYwBvACAAaQBzACAAYQAgAHQAcgBhAGQAZQBtAGEAcgBrACAAbwBmACAAQQBwAHAAbABlACAASQBuAGMALgBBAHAAcABsAGUAIABJAG4AYwAuAEEAcABwAGwAZQAgAEkAbgBjAC4AQQBwAHAAbABlACAASQBuAGMALgBoAHQAdABwADoALwAvAHcAdwB3AC4AYQBwAHAAbABlAC4AYwBvAG0ALwBoAHQAdABwADoALwAvAHcAdwB3AC4AYQBwAHAAbABlAC4AYwBvAG0ALwBDAG8AcAB5AHIAaQBnAGgAdAAgAKkAIAAyADAAMQA1AC0AMgAwADEANwAgAEEAcABwAGwAZQAgAEkAbgBjAC4AIABBAGwAbAAgAHIAaQBnAGgAdABzACAAcgBlAHMAZQByAHYAZQBkAC4AIAAgAFkAbwB1AHIAIAB1AHMAZQAgAG8AZgAgAHQAaABlACAAUwBhAG4AIABGAHIAYQBuAGMAaQBzAGMAbwAgAGYAbwBuAHQAIABpAHMAIABzAHUAYgBqAGUAYwB0ACAAdABvACAAdABoAGUAIAB0AGUAcgBtAHMAIABvAGYAIAB0AGgAZQAgAGEAcABwAGwAaQBjAGEAYgBsAGUAIABpAE8AUwAgAFMAbwBmAHQAdwBhAHIAZQAgAEwAaQBjAGUAbgBzAGUAIABBAGcAcgBlAGUAbQBlAG4AdAAuAFMARgAgAFAAcgBvACAAVABlAHgAdABNAGUAZABpAHUAbQACAAAAAAAA/tgAmgAAAAAAAAAAAAAAAAAAAAAAAAASABIAAAADACQAJgA2AEgASgBLAEwATwBRAFIAUwBXAFgAWgAPAQIHdW5pRjhGRgAA) format("truetype")\n  }\n    </style>\n  </defs>\n  <g>\n    <text font-size="15px" font-family="SF Pro Text">ï£¿</text>\n    <text x="15" font-size="12px" font-family="${B}">${i}</text>\n  </g>\n  </svg>\n  `;
        })(t, A);
      return ((A, e, t = '') => {
        t || (t = '');
        var n = '';
        for (var i in e)
          e.hasOwnProperty(i) && (n += ' ' + i + '="' + e[i] + '"');
        return '<' + A + n + '>' + t + '</' + A + '>';
      })(
        'div',
        {
          style: (A => {
            var e = '';
            for (var t in A)
              A[t] && A.hasOwnProperty(t) && (e += ' ' + t + ': ' + A[t] + ';');
            return e;
          })({
            display: 'inline-flex',
            'box-sizing': 'border-box',
            width: '100%',
            height: '100%',
            'min-width': '140px',
            'max-width': '375px',
            'min-height': '30px',
            'max-height': '64px',
            'border-radius': '5px',
            'background-color': 'black' === A ? 'black' : 'white',
            color: 'black' === A ? 'white' : 'black',
            border: n ? '.5px solid black' : null,
            'padding-right': '10px',
            'padding-left': '10px',
          }),
          role: 'button',
          tabindex: '0',
          'aria-label': i.text,
        },
        B
      );
    },
    n = ({
      id: A = 'appleid-button',
      color: e = 'black',
      type: n = 'sign-in',
      border: i = !1,
    } = {}) => {
      ((A, e) => {
        var t = document.getElementById(A);
        if (null !== t) t.innerHTML = e;
      })(A, t({ color: e, type: n, border: i }));
    },
    i = ['0', '0'],
    B = () => {
      (i[1] = '2'), W.signIn();
    },
    o = () => {
      B();
    },
    r = A => {
      32 === A.keyCode
        ? A.preventDefault()
        : 13 === A.keyCode && (A.preventDefault(), B());
    },
    c = A => {
      32 === A.keyCode && (A.preventDefault(), B());
    },
    d = () => {
      const A = (() => document.getElementById('appleid-signin'))();
      if (A) {
        (A => A && A.firstChild && A.removeChild(A.firstChild))(A);
        const e = (A => {
          const e = A.dataset;
          let t = 'black',
            n = !0,
            i = 'sign-in';
          return (
            null != e &&
              (e.color && (t = e.color),
              e.border && (n = 'false' !== e.border),
              e.type && (i = e.type)),
            'sign in' === i && (i = 'sign-in'),
            { color: t, border: n, type: i }
          );
        })(A);
        n({ id: 'appleid-signin', ...e }),
          A.addEventListener('click', o),
          A.addEventListener('keydown', r),
          A.addEventListener('keyup', c);
      }
    },
    g = {
      baseURI: 'https://appleid.apple.com',
      path: '/auth/authorize',
      originURI: '',
      env: 'prod',
      uxMode: 'redirect',
      responseType: 'code id_token',
      responseMode: 'form_post',
      client: {
        clientId: '',
        scope: '',
        redirectURI: '',
        state: '',
        nonce: '',
      },
    },
    l = 'user_trigger_new_signin_flow',
    s = 'popup_closed_by_user',
    w = 'popup_blocked_by_browser',
    a = {};
  let I = g.baseURI;
  window.addEventListener(
    'message',
    A => {
      try {
        if (A.origin !== I) return;
        const e = JSON.parse(A.data);
        e.method in a && a[e.method](e.data);
      } catch (A) {}
    },
    !1
  );
  var E,
    p = A => {
      'dev' === A.env && (I = A.baseURI);
    },
    Q = (A, e) => {
      a[A] = e;
    };
  let u;
  !(function(A) {
    (A.ClientId = 'appleid-signin-client-id'),
      (A.Scope = 'appleid-signin-scope'),
      (A.RedirectURI = 'appleid-signin-redirect-uri'),
      (A.State = 'appleid-signin-state'),
      (A.Nonce = 'appleid-signin-nonce'),
      (A.DEV_URI = 'appleid-signin-dev-uri'),
      (A.DEV_ENV = 'appleid-signin-dev-env'),
      (A.DEV_PATH = 'appleid-signin-dev-path');
  })(E || (E = {}));
  const M = () => {
      if (!u) {
        u = {};
        const A = (() => {
            const A = {};
            return Object.keys(E).forEach(e => (A[E[e]] = !0)), A;
          })(),
          e = document.getElementsByTagName('meta');
        let t = '';
        for (let n = 0; n < e.length; n++)
          A[(t = e[n].getAttribute('name'))] &&
            (u[t] = e[n].getAttribute('content'));
      }
      return u;
    },
    h = A => {
      let e =
        `${A.baseURI}${A.path}?client_id=` +
        encodeURIComponent(A.client.clientId) +
        '&redirect_uri=' +
        encodeURIComponent(A.client.redirectURI) +
        '&response_type=' +
        encodeURIComponent(A.responseType);
      return (
        ['state', 'scope', 'nonce'].forEach(t => {
          A.client[t] && (e = `${e}&${t}=${encodeURIComponent(A.client[t])}`);
        }),
        (e =
          (e =
            (e = e + '&response_mode=' + encodeURIComponent(A.responseMode)) +
            '&frame_id=' +
            (() =>
              'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(
                A
              ) {
                var e = (16 * Math.random()) | 0;
                return ('x' == A ? e : (3 & e) | 8).toString(16);
              }))()) +
          '&m=' +
          i[0] +
          i[1]),
        (e += '&v=1.1.6')
      );
    },
    U = {},
    b = {},
    y = A => (b[A] || (b[A] = []), b[A]),
    x = (A, e) => {
      y(A).forEach(A => A(e));
    },
    C = (A, e) => {
      const t = window.innerWidth
          ? window.innerWidth
          : document.documentElement.clientWidth
          ? document.documentElement.clientWidth
          : screen.width,
        n = window.innerHeight
          ? window.innerHeight
          : document.documentElement.clientHeight
          ? document.documentElement.clientHeight
          : screen.height;
      return {
        left: t / 2 - A / 2 + window.screenLeft,
        top: n / 2 - e / 2 + window.screenTop,
      };
    },
    G = {
      strWindowFeatures: `width=700,height=700,left=${C(700, 700).left},top=${
        C(700, 700).top
      },resizable=no,location=no,menubar=no`,
      windowName: 'Apple authentication',
    },
    m = A =>
      ((A, e, t) => {
        let n = window.open(A, e, t);
        if (n) {
          U[e] = n;
          const A = setInterval(() => {
            n.closed &&
              (U[e] && (U[e] = null), x(e, 'closed'), clearInterval(A));
          }, 300);
        }
        return n;
      })(A, G.windowName, G.strWindowFeatures),
    f = () =>
      (A => {
        U[A] && (U[A].close(), (U[A] = null));
      })(G.windowName),
    R = [],
    H = [],
    F = A => {
      const e = R.indexOf(A);
      R.splice(e, 1), H.splice(e, 1);
    },
    D = A => {
      const e = R.indexOf(A);
      return H[e];
    },
    v = A => -1 !== R.indexOf(A),
    Z = () => {
      let A, e, t;
      return (
        ((A, e) => {
          R.push(A), H.push(e);
        })(
          (A = new Promise((A, n) => {
            (t = A), (e = n);
          })),
          { reject: e, resolve: t }
        ),
        A
      );
    },
    k = (A, e) => {
      v(A) && (D(A).reject(e), F(A));
    };
  let T = null;
  (A =>
    ((A, e) => {
      y(A).push(e);
    })(G.windowName, A))(A => {
    v(T) && 'closed' === A && k(T, { error: s });
  }),
    Q('oauthDone', A => {
      v(T) &&
        ('error' in A
          ? k(T, A)
          : ((A, e) => {
              v(A) && (D(A).resolve(e), F(A));
            })(T, A)),
        f();
    });
  const Y = A => {
    v(T) && k(T, { error: l }), (i[1] = '1');
    const e = h(A);
    if ('popup' === A.uxMode) {
      if (!(() => !!window.Promise)())
        throw new Error(
          'Promise is required to use popup, please use polyfill.'
        );
      if (m(e)) return (T = Z());
      Promise.reject({ error: w });
    } else (A => window.location.assign(A))(e);
  };
  let S = !1;
  const N = A => {
      if (!A.clientId || 'string' != typeof A.clientId)
        throw new Error('The "clientId" should be a string.');
      if (
        ((g.client.clientId = A.clientId),
        !A.redirectURI || 'string' != typeof A.redirectURI)
      )
        throw new Error('The "redirectURI" should be a string.');
      (g.client.redirectURI = A.redirectURI), j(A), d(), (S = !0);
    },
    j = (A, e = g) => {
      ['scope', 'state', 'nonce'].forEach(t => {
        if (A[t]) {
          if ('string' != typeof A[t])
            throw new Error('The "' + t + '" should be a string.');
          e.client[t] = A[t];
        }
      });
    },
    z = A => {
      const e = Object.create(g);
      return (
        (e.client = Object.create(g.client)),
        A.scope && 'string' == typeof A.scope && (e.client.scope = A.scope),
        A.redirectURI &&
          'string' == typeof A.redirectURI &&
          (e.client.redirectURI = A.redirectURI),
        e
      );
    };
  let V = {};
  const W = {
      init(A) {
        (i[0] = '2' === i ? '3' : '1'), (V = { ...V, ...A }), N(A);
      },
      signIn: (A = null) => {
        let e = g;
        if (!S) throw new Error('The "init" function must be called first.');
        if (A) {
          if (!(A instanceof Object) || Array.isArray(A))
            throw new Error('The "signinConfig" must be "object".');
          (e = z(A)), j(A, e);
        }
        return Y(e);
      },
      renderButton: d,
    },
    J = () => {
      if (
        (() => {
          const A = M();
          return Object.keys(A).length > 0;
        })()
      ) {
        i[0] = '1' === i ? '4' : '2';
        const A = (() => {
          const A = {
              clientId: '',
              scope: '',
              redirectURI: '',
              state: '',
              nonce: '',
            },
            e = M();
          e[E.ClientId] && (A.clientId = e[E.ClientId]),
            e[E.Scope] && (A.scope = e[E.Scope]),
            e[E.RedirectURI] && (A.redirectURI = e[E.RedirectURI]),
            e[E.State] && (A.state = e[E.State]),
            e[E.Nonce] && (A.nonce = e[E.Nonce]);
          const t = e[E.DEV_ENV],
            n = e[E.DEV_PATH],
            i = e[E.DEV_URI];
          return (
            (t || n || i) &&
              (t && (g.env = t),
              n && (g.path = n),
              i && ((g.baseURI = i), p(g))),
            A
          );
        })();
        N({ ...A, ...V });
      }
    };
  var L, P;
  'complete' === document.readyState ||
  'loaded' === document.readyState ||
  'interactive' === document.readyState
    ? J()
    : document.addEventListener('DOMContentLoaded', () => {
        J();
      }),
    (L = 'AppleIDSigInLoaded'),
    (P = document.createEvent('Event')).initEvent(L, !0, !0),
    setTimeout(() => document.dispatchEvent(P)),
    (A.auth = W),
    Object.defineProperty(A, '__esModule', { value: !0 });
});
/*eslint-enable */
