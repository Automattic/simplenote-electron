import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as S from '../state';

import { closeDialog } from '../state/ui/actions';

type DispatchProps = {
  closeDialog: () => any;
};

type Props = DispatchProps;

export class Dialog extends Component<Props> {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    closeBtnLabel: PropTypes.string,
    hideTitleBar: PropTypes.bool,
    title: PropTypes.string,
  };

  render() {
    const {
      className,
      closeBtnLabel = 'Done',
      hideTitleBar,
      title,
      children,
    } = this.props;

    return (
      <div
        className={classNames(
          className,
          'dialog theme-color-bg theme-color-fg theme-color-border'
        )}
      >
        {!hideTitleBar && (
          <div className="dialog-title-bar theme-color-border">
            <div className="dialog-title-side" />
            <h2 className="dialog-title-text">{title}</h2>
            <div className="dialog-title-side">
              {!!this.props.closeDialog && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="button button-borderless"
                  onClick={this.props.closeDialog}
                >
                  {closeBtnLabel}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="dialog-content">{children}</div>
      </div>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
});

export default connect(null, mapDispatchToProps)(Dialog);
