import React, { useLayoutEffect, useRef, type ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react';

import { useScrollMemory } from './scroll-memory';
import {
  getNotePosition,
  setNotePosition,
} from '../utils/note-scroll-position';

// jsdom has no layout, so scrollTop is inert. Simulate a real scroll
// container: scrollTop clamps to [0, maxScrollTop] and rounds to whole
// pixels (browsers round assignments to device pixels, so a fractional
// write can read back differently). scrollHeight / clientHeight are derived
// so that scrollHeight - clientHeight === maxScrollTop (the browser
// invariant for max scroll).
const CLIENT_HEIGHT = 100;
let maxScrollTop = 0;
const scrollTops = new WeakMap<Element, number>();

const elementOverrides: PropertyDescriptorMap = {
  scrollTop: {
    configurable: true,
    get(this: Element) {
      return scrollTops.get(this) ?? 0;
    },
    set(this: Element, value: number) {
      scrollTops.set(
        this,
        Math.round(Math.max(0, Math.min(value, maxScrollTop)))
      );
    },
  },
  scrollHeight: {
    configurable: true,
    get() {
      return maxScrollTop + CLIENT_HEIGHT;
    },
  },
  clientHeight: {
    configurable: true,
    get() {
      return CLIENT_HEIGHT;
    },
  },
};

const originalDescriptors = Object.fromEntries(
  Object.keys(elementOverrides).map((property) => [
    property,
    Object.getOwnPropertyDescriptor(Element.prototype, property),
  ])
);

class MockResizeObserver implements ResizeObserver {
  static instances: MockResizeObserver[] = [];

  observed: Element[] = [];
  isDisconnected = false;

  constructor(private callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve(element: Element) {
    this.observed = this.observed.filter((observed) => observed !== element);
  }

  disconnect() {
    this.isDisconnected = true;
    this.observed = [];
  }

  resize() {
    if (!this.isDisconnected) {
      this.callback([], this);
    }
  }
}

// Mirrors the production DOM: the wrapper div is pinned to the shell's
// height by `.note-detail-markdown { height: 100% }`, and only the inner
// contenteditable grows with content.
function Harness({
  noteId,
  children,
}: {
  noteId: string;
  children?: ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  useScrollMemory(shellRef, noteId);

  return (
    <div data-testid="shell" ref={shellRef}>
      <div className="lexical-md-editor">
        <div className="lexical-md-editor__input" data-testid="input">
          {children}
        </div>
      </div>
    </div>
  );
}

// Simulates Lexical scrolling the caret into view while attaching content:
// a child layout effect, which runs before the hook's restore effect.
function ScrollsShellOnMount({ scrollTo }: { scrollTo: number }) {
  const markerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = markerRef.current?.closest(
      '[data-testid="shell"]'
    ) as HTMLElement | null;
    if (!shell) {
      throw new Error('Expected the marker to be rendered inside the shell');
    }
    shell.scrollTop = scrollTo;
  }, [scrollTo]);

  return <div ref={markerRef} />;
}

function renderShell(noteId: string, children?: ReactNode) {
  const result = render(<Harness noteId={noteId}>{children}</Harness>);
  return {
    shell: result.getByTestId('shell'),
    input: result.getByTestId('input'),
    unmount: result.unmount,
  };
}

function lastObserver(): MockResizeObserver {
  const observer =
    MockResizeObserver.instances[MockResizeObserver.instances.length - 1];
  if (!observer) {
    throw new Error('Expected a ResizeObserver to have been created');
  }
  return observer;
}

beforeAll(() => {
  Object.defineProperties(Element.prototype, elementOverrides);
  (global as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver;
});

afterAll(() => {
  for (const [property, descriptor] of Object.entries(originalDescriptors)) {
    if (descriptor) {
      Object.defineProperty(Element.prototype, property, descriptor);
    } else {
      delete (Element.prototype as unknown as Record<string, unknown>)[
        property
      ];
    }
  }
});

beforeEach(() => {
  sessionStorage.clear();
  maxScrollTop = 1000;
  MockResizeObserver.instances = [];
});

describe('useScrollMemory', () => {
  describe('restore on mount', () => {
    it('restores the saved position synchronously when content is tall enough', () => {
      setNotePosition('note-1', 300);

      const { shell } = renderShell('note-1');

      expect(shell.scrollTop).toBe(300);
      expect(MockResizeObserver.instances).toHaveLength(0);
    });

    it('leaves scroll at the top when no position is saved', () => {
      const { shell } = renderShell('note-1');

      expect(shell.scrollTop).toBe(0);
      expect(MockResizeObserver.instances).toHaveLength(0);
    });

    it('does not restore a position saved for a different note', () => {
      setNotePosition('other-note', 300);

      const { shell } = renderShell('note-1');

      expect(shell.scrollTop).toBe(0);
    });

    it('treats sub-pixel rounding as a successful restore', () => {
      setNotePosition('note-1', 300.25);

      const { shell } = renderShell('note-1');

      expect(shell.scrollTop).toBe(300);
      expect(MockResizeObserver.instances).toHaveLength(0);
    });
  });

  describe('mount-time scrolls from the editor (caret into view)', () => {
    it('resets to the top when nothing is saved', () => {
      const { shell } = renderShell(
        'note-1',
        <ScrollsShellOnMount scrollTo={500} />
      );

      expect(shell.scrollTop).toBe(0);
    });

    it('resets to the top when the saved position is zero', () => {
      setNotePosition('note-1', 0);

      const { shell } = renderShell(
        'note-1',
        <ScrollsShellOnMount scrollTo={500} />
      );

      expect(shell.scrollTop).toBe(0);
    });

    it('restores the saved position over the mount-time scroll', () => {
      setNotePosition('note-1', 300);

      const { shell } = renderShell(
        'note-1',
        <ScrollsShellOnMount scrollTo={500} />
      );

      expect(shell.scrollTop).toBe(300);
    });
  });

  describe('restore deferred until content is ready', () => {
    it('watches the growing input element when the saved position is not yet reachable', () => {
      setNotePosition('note-1', 800);
      maxScrollTop = 100;

      const { input } = renderShell('note-1');

      expect(MockResizeObserver.instances).toHaveLength(1);
      expect(lastObserver().observed).toContain(input);
    });

    it('jumps to the saved position once content grows enough', () => {
      setNotePosition('note-1', 800);
      maxScrollTop = 100;

      const { shell } = renderShell('note-1');

      maxScrollTop = 1000;
      lastObserver().resize();

      expect(shell.scrollTop).toBe(800);
      expect(lastObserver().isDisconnected).toBe(true);
    });

    it('keeps waiting while content is still too short', () => {
      setNotePosition('note-1', 800);
      maxScrollTop = 100;

      const { shell } = renderShell('note-1');

      maxScrollTop = 200;
      lastObserver().resize();

      expect(shell.scrollTop).toBeLessThan(800);
      expect(lastObserver().isDisconnected).toBe(false);
    });

    it('gives up once the user scrolls', () => {
      setNotePosition('note-1', 800);
      maxScrollTop = 100;

      const { shell } = renderShell('note-1');
      fireEvent.wheel(shell);

      expect(lastObserver().isDisconnected).toBe(true);

      maxScrollTop = 1000;
      lastObserver().resize();
      expect(shell.scrollTop).not.toBe(800);
    });

    it('stops watching on unmount', () => {
      setNotePosition('note-1', 800);
      maxScrollTop = 100;

      const { unmount } = renderShell('note-1');
      unmount();

      expect(lastObserver().isDisconnected).toBe(true);
    });
  });

  describe('save on unmount', () => {
    it('saves the current scroll position when unmounting', () => {
      const { shell, unmount } = renderShell('note-1');
      shell.scrollTop = 240;

      unmount();

      expect(getNotePosition('note-1')).toBe(240);
    });

    it('saves zero when the shell was not scrolled', () => {
      setNotePosition('note-1', 700);
      maxScrollTop = 0;

      const { unmount } = renderShell('note-1');
      unmount();

      expect(getNotePosition('note-1')).toBe(0);
    });
  });

  describe('clear on window resize', () => {
    it('clears all saved positions when the window resizes', () => {
      setNotePosition('note-1', 300);
      setNotePosition('note-2', 500);

      renderShell('note-1');
      fireEvent(window, new Event('resize'));

      expect(getNotePosition('note-1')).toBeFalsy();
      expect(getNotePosition('note-2')).toBeFalsy();
    });

    it('stops clearing after unmount', () => {
      const { unmount } = renderShell('note-1');
      unmount();

      setNotePosition('note-2', 500);
      fireEvent(window, new Event('resize'));

      expect(getNotePosition('note-2')).toBe(500);
    });
  });
});
