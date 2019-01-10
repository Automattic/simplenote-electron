import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class TagListInput extends Component {
  static propTypes = {
    editable: PropTypes.bool.isRequired,
    isSelected: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
  };

  constructor(props) {
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
        onChange={e => this.setState({ value: e.target.value })}
        onBlur={onDone}
        spellCheck={false}
      />
    );
  }
}

export default TagListInput;
