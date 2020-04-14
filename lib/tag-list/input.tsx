import React, { Component, FocusEvent, MouseEvent } from 'react';
import classNames from 'classnames';

type OwnProps = {
  editable: boolean;
  isSelected: boolean;
  onClick: (event: MouseEvent<HTMLInputElement>) => any;
  onDone: (event: FocusEvent<HTMLInputElement>) => any;
  value: string;
};

type OwnState = {
  value: string;
};

type Props = OwnProps;

export class TagListInput extends Component<Props, OwnState> {
  constructor(props: Props) {
    super(props);
    this.state = { value: props.value };
  }

  render() {
    const { editable, isSelected, onClick, onDone } = this.props;
    const { value } = this.state;
    const classes = classNames('tag-list-input', 'theme-color-fg', {
      'is-selected': isSelected,
    });

    return (
      <input
        className={classes}
        readOnly={!editable}
        onClick={onClick}
        value={value}
        onChange={(e) => this.setState({ value: e.target.value })}
        onBlur={onDone}
        spellCheck={false}
      />
    );
  }
}

export default TagListInput;
