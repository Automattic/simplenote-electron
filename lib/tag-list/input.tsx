import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import actions from '../state/actions';

import type * as S from '../state';
import type * as T from '../types';

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
  const onDone = (event: React.FocusEvent<HTMLInputElement>) => {
    const newTagName = event.target?.value.trim() as T.TagName;

    if (newTagName && newTagName !== tagName) {
      renameTag(tagName, newTagName);
    } else {
      setTagName(tagName);
    }
  };
  const classes = classNames('tag-list-input', {
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
