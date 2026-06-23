import { useEffect, useState } from 'react';

const COMPACT_MEDIA = '(max-width: 750px)';
const NARROW_TOOLBAR_WIDTH = 520;

export function useCompactToolbar(toolbarEl: HTMLElement | null): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setCompact(
        toolbarEl !== null && toolbarEl.clientWidth < NARROW_TOOLBAR_WIDTH
      );
      return;
    }

    const media = window.matchMedia(COMPACT_MEDIA);

    const update = () => {
      const narrowViewport = media.matches;
      const narrowToolbar =
        toolbarEl !== null && toolbarEl.clientWidth < NARROW_TOOLBAR_WIDTH;
      setCompact(narrowViewport || narrowToolbar);
    };

    update();
    media.addEventListener('change', update);

    const observer =
      toolbarEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(update)
        : null;
    observer?.observe(toolbarEl);

    return () => {
      media.removeEventListener('change', update);
      observer?.disconnect();
    };
  }, [toolbarEl]);

  return compact;
}
