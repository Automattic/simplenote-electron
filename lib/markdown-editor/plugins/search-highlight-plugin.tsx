import { useCallback, useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_LOW, KEY_ESCAPE_COMMAND } from 'lexical';

import {
  $collectTextSegments,
  $createDOMRangeForTextMatch,
  $getTextMatchRanges,
  applySearchHighlights,
  clearSearchHighlights,
  scrollRangeIntoView,
} from '../search/search-highlight';

type Props = {
  clearSearch: () => void;
  onMatchCountChange: (count: number) => void;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  searchQuery: string;
  selectedSearchMatchIndex: number | null;
};

function applyHighlightsForQuery(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  searchQuery: string,
  selectedSearchMatchIndex: number | null
): Range | null {
  let selectedRange: Range | null = null;

  editor.getEditorState().read(() => {
    const segments = $collectTextSegments().segments;
    const matches = $getTextMatchRanges(searchQuery);
    const domRanges = matches
      .map((match) => $createDOMRangeForTextMatch(editor, segments, match))
      .filter((range): range is Range => range !== null);

    selectedRange =
      selectedSearchMatchIndex !== null && domRanges[selectedSearchMatchIndex]
        ? domRanges[selectedSearchMatchIndex]
        : null;

    const nonSelectedRanges =
      selectedSearchMatchIndex === null
        ? domRanges
        : domRanges.filter((_, index) => index !== selectedSearchMatchIndex);

    applySearchHighlights(nonSelectedRanges, selectedRange);
  });

  return selectedRange;
}

export function SearchHighlightPlugin({
  clearSearch,
  onMatchCountChange,
  scrollContainerRef,
  searchQuery,
  selectedSearchMatchIndex,
}: Props) {
  const [editor] = useLexicalComposerContext();
  const matchCountRef = useRef(0);

  const refreshHighlights = useCallback(() => {
    if ('' === searchQuery.trim()) {
      clearSearchHighlights();
      if (0 !== matchCountRef.current) {
        matchCountRef.current = 0;
        onMatchCountChange(0);
      }
      return null;
    }

    const selectedRange = applyHighlightsForQuery(
      editor,
      searchQuery,
      selectedSearchMatchIndex
    );

    editor.getEditorState().read(() => {
      const matches = $getTextMatchRanges(searchQuery);
      if (matches.length !== matchCountRef.current) {
        matchCountRef.current = matches.length;
        onMatchCountChange(matches.length);
      }
    });

    return selectedRange;
  }, [editor, onMatchCountChange, searchQuery, selectedSearchMatchIndex]);

  useEffect(() => {
    refreshHighlights();

    return editor.registerUpdateListener(() => {
      refreshHighlights();
    });
  }, [editor, refreshHighlights]);

  useEffect(() => {
    if (
      '' === searchQuery.trim() ||
      selectedSearchMatchIndex === null ||
      Number.isNaN(selectedSearchMatchIndex)
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const selectedRange = applyHighlightsForQuery(
        editor,
        searchQuery,
        selectedSearchMatchIndex
      );

      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && selectedRange) {
        scrollRangeIntoView(scrollContainer, selectedRange);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [editor, scrollContainerRef, searchQuery, selectedSearchMatchIndex]);

  useEffect(() => {
    return () => {
      clearSearchHighlights();
    };
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if ('' !== searchQuery && matchCountRef.current > 0) {
          clearSearch();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [clearSearch, editor, searchQuery]);

  return null;
}
