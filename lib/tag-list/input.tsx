import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import actions from '../state/actions';

import type * as S from '../state';
import type * as T from '../types';
import {
  isTagInputKey,
  tagHashOf,
  MAX_TAG_HASH_LENGTH,
} from '../utils/tag-hash';

type OwnProps = {
  editable: boolean;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => any;
  tagName: T.TagName;
};

type OwnState = {
  enteredTagName: string;
};

type DispatchProps = {
  renameTag: (oldTagName: T.TagName, newTagName: T.TagName) => any;
};

type Props = OwnProps & DispatchProps;

export const TagListInput: FunctionComponent<Props> = ({
  editable,
  isSelected,
  onClick,
  renameTag,
  tagName,
}) => {
  const [enteredTagName, setTagName] = useState(tagName);
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTagName(event.target.value.replace(/[\s,]/g, ''));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (
      tagHashOf(enteredTagName).length >= MAX_TAG_HASH_LENGTH &&
      isTagInputKey(event.which)
    ) {
      event.preventDefault();
    }
  };

  const onDone = (event: React.FocusEvent<HTMLInputElement>) => {
    const newTagName = event.target?.value.trim() as T.TagName;

    if (tagHashOf(newTagName).length > MAX_TAG_HASH_LENGTH) {
      setTagName(tagName);
      return;
    }
    if (newTagName && newTagName !== tagName) {
      renameTag(tagName, newTagName);
    } else {
      setTagName(tagName);
    }
  };
  const classes = classNames('tag-list-input', 'theme-color-fg', {
    'is-selected': isSelected,
  });

  return editable ? (
    <input
      className={classes}
      readOnly={!editable}
      onClick={onClick}
      value={enteredTagName}
      onChange={onChange}
      onBlur={onDone}
      spellCheck={false}
      onKeyDown={onKeyDown}
    />
  ) : (
    <button className={classes} onClick={onClick}>
      {enteredTagName}
    </button>
  );
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  renameTag: actions.data.renameTag,
};

export default connect(null, mapDispatchToProps)(TagListInput);
