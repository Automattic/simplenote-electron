import filterNotes from './filter-notes';
import { filterTags } from './filter-tags';

import * as T from '../types';

type ApplySearchCommand = {
  action: 'applySearch';
  delay: number;
  filter: string;
  notes: T.NoteEntity[] | null;
  showTrash: boolean;
  tag?: T.TagEntity;
  tags: T.TagEntity[];
};

type SearchCommand = ApplySearchCommand;

export interface SearchPort extends MessagePort {
  postMessage: (message: SearchCommand) => void;
}

const ctx: Worker = self as any;

let searchTimeout: NodeJS.Timeout;

ctx.onmessage = bootEvent => {
  const mainApp = bootEvent.ports[0];

  mainApp.onmessage = event => {
    switch (event.data.action) {
      case 'applySearch': {
        const { delay, filter, notes, showTrash, tag, tags } = event.data;

        clearTimeout(searchTimeout);
        const go = () => {
          const filteredNotes = filterNotes({ filter, notes, showTrash, tag });
          const filteredTags = filterTags(filter, notes, tags);

          mainApp.postMessage({
            action: 'applySearch',
            filter,
            notes: filteredNotes,
            tags: filteredTags,
          });
        };

        if (delay) {
          searchTimeout = setTimeout(go, delay);
        } else {
          go();
        }
        break;
      }
    }
  };
};
