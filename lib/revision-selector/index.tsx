import React, { Component, ChangeEventHandler } from 'react';
import FocusTrap from 'focus-trap-react';
import format from 'date-fns/format';
import classNames from 'classnames';

import Slider from '../components/slider';
import CheckboxControl from '../controls/checkbox';

import type * as T from '../types';

type Props = {
  onAccept: () => void;
  onCancel: () => void;
  onSelect: (revisionIndex: number) => void;
  onToggleRestoreDeletedTags: (toggled: boolean) => void;
  restoreDeletedTags: boolean;
  revision: T.Note | undefined;
  revisionsSize: number;
  selectedIndex: number;
};

export class RevisionSelector extends Component<Props> {
  onSelectRevision: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    const selection = parseInt(value, 10);
    this.props.onSelect(selection);
  };

  render() {
    const {
      onAccept,
      onCancel,
      onToggleRestoreDeletedTags,
      restoreDeletedTags,
      revision,
      revisionsSize,
      selectedIndex,
    } = this.props;

    const isNewest = selectedIndex === revisionsSize - 1;

    const leftPos = Number(
      // Based on ((selected - min) * 100) / (max - min);
      // min is equal to 1
      // max is the number of size of revisions -1.
      (((selectedIndex === -1 ? revisionsSize - 1 : selectedIndex) - 1) * 100) /
        (revisionsSize - 2)
    );

    const datePos = `calc(${leftPos}% + (${8 - leftPos * 0.15}px))`;

    const modificationDate = revision?.modificationDate;
    const revisionDate = modificationDate
      ? format(modificationDate * 1000, 'MMM d, yyyy h:mm a')
      : '';

    const mainClasses = classNames(
      'revision-selector theme-color-border theme-color-fg theme-color-bg'
    );

    return (
      <FocusTrap
        focusTrapOptions={{
          clickOutsideDeactivates: true,
          // Fallback required due to RevisionSelect's placement within
          // Suspsense, which hides elements preventing focus. https://git.io/Jqep9
          fallbackFocus: 'body',
          onDeactivate: onCancel,
        }}
      >
        <div
          className={mainClasses}
          role="dialog"
          aria-labelledby="revision-slider-title"
        >
          <div className="revision-selector-inner">
            <div id="revision-slider-title" className="revision-slider-title">
              History
            </div>
            <div
              aria-hidden
              className="revision-date"
              style={{ left: datePos }}
            >
              {revisionDate}
            </div>
            <div className="revision-slider">
              <Slider
                aria-valuetext={`Revision from ${revisionDate}`}
                disabled={revisionsSize === 0}
                min={
                  1 /* don't allow reverting to the very first version because that's a blank note */
                }
                max={revisionsSize - 1}
                value={selectedIndex > -1 ? selectedIndex : revisionsSize - 1}
                onChange={this.onSelectRevision}
              />
            </div>
            <section className="revision-actions">
              <label
                className="revision-deleted-tags-label"
                htmlFor="revision-deleted-tags-checkbox"
              >
                <CheckboxControl
                  id="revision-deleted-tags-checkbox"
                  checked={restoreDeletedTags}
                  isStandard
                  onChange={() => {
                    onToggleRestoreDeletedTags(!restoreDeletedTags);
                  }}
                />
                <span className="revision-deleted-tags-text">
                  Restore deleted tags
                </span>
              </label>
              <div className="revision-buttons">
                <button
                  className="button button-secondary button-compact"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  aria-label={`Restore revision from ${revisionDate}`}
                  disabled={!!isNewest}
                  className="button button-primary button-compact"
                  onClick={onAccept}
                >
                  Restore
                </button>
              </div>
            </section>
          </div>
        </div>
      </FocusTrap>
    );
  }
}

export default RevisionSelector;
