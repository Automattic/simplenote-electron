import { useCallback, useEffect } from 'react';

type Options = {
  enabled: boolean;
  matchCount: number;
  onNext: () => void;
  onPrev: () => void;
};

export function useInNoteSearchShortcuts({
  enabled,
  matchCount,
  onNext,
  onPrev,
}: Options): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || 0 === matchCount) {
        return;
      }

      const cmdOrCtrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (cmdOrCtrl && event.shiftKey && 'g' === key) {
        onPrev();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!window.electron && cmdOrCtrl && !event.shiftKey && 'g' === key) {
        onNext();
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, matchCount, onNext, onPrev]);
}

export function useElectronFindAgain(onNext: () => void, matchCount: number) {
  const findAgain = useCallback(() => {
    if (matchCount > 0) {
      onNext();
    }
  }, [matchCount, onNext]);

  useEffect(() => {
    window.electron?.receive('editorCommand', (command) => {
      if ('findAgain' === command.action) {
        findAgain();
      }
    });

    return () => {
      window.electron?.removeListener('editorCommand');
    };
  }, [findAgain]);
}
