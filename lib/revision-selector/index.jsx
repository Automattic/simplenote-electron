import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import onClickOutside from 'react-onclickoutside';
import moment from 'moment';
import { orderBy } from 'lodash';
import classNames from 'classnames';
import appState from '../flux/app-state';

const sortedRevisions = revisions =>
  orderBy(revisions, 'data.modificationDate', 'asc');

export class RevisionSelector extends Component {
  static propTypes = {
    isViewingRevisions: PropTypes.bool.isRequired,
    note: PropTypes.object,
    revisions: PropTypes.array.isRequired,
    onUpdateContent: PropTypes.func.isRequired,
    setRevision: PropTypes.func.isRequired,
    resetIsViewingRevisions: PropTypes.func.isRequired,
    cancelRevision: PropTypes.func.isRequired,
  };

  constructor(...args) {
    super(...args);

    this.state = {
      revisions: sortedRevisions(this.props.revisions),
      selection: Infinity,
    };
  }

  componentWillReceiveProps({ revisions: nextRevisions }) {
    const { revisions: prevRevisions } = this.props;

    if (nextRevisions === prevRevisions) {
      return;
    }

    this.setState({
      revisions: sortedRevisions(nextRevisions),
    });
  }

  componentDidUpdate({ revisions: prevRevisions }) {
    const { revisions: nextRevisions } = this.props;

    if (prevRevisions !== nextRevisions) {
      // I'm not sure why exactly, but
      // this control wasn't refreshing
      // after loading in the revisions
      // the first time.
      //
      // This led to the 'Latest' revision
      // being in position 1 instead of
      // on the far right.
      //
      // This forces the refresh to correct
      // things until we figure out what's
      // really causing the problem.
      this.forceUpdate();
    }
  }

  handleClickOutside = () => this.onCancelRevision();

  onAcceptRevision = () => {
    const { note, onUpdateContent, resetIsViewingRevisions } = this.props;
    const { revisions, selection } = this.state;
    const revision = revisions[selection];

    if (revision) {
      const { data: { content } } = revision;

      onUpdateContent(note, content);
      resetIsViewingRevisions();
    }
    this.resetSelection();
  };

  resetSelection = () => this.setState({ selection: Infinity });

  onSelectRevision = ({ target: { value } }) => {
    const { revisions } = this.state;

    const selection = parseInt(value, 10);
    const revision = revisions[selection];

    this.setState({
      selection,
    });
    this.props.setRevision(revision);
  };

  onCancelRevision = () => {
    this.props.cancelRevision();
    this.resetSelection();
  };

  render() {
    const { isViewingRevisions } = this.props;
    const { revisions, selection: rawSelection } = this.state;

    const min = 0;
    const max = Math.max(revisions.length - 1, 1);
    const selection = Math.min(rawSelection, max);

    const revisionDate =
      !revisions.length || selection === max
        ? 'Latest'
        : moment
            .unix(revisions[selection].data.modificationDate)
            .format('MMM D, YYYY h:mm a');

    const revisionButtonStyle =
      selection === max ? { opacity: '0.5', pointerEvents: 'none' } : {};

    const mainClasses = classNames('revision-selector', {
      'is-visible': isViewingRevisions,
    });

    return (
      <div className={mainClasses}>
        <div className="revision-date">{revisionDate}</div>
        <div className="revision-slider">
          <input
            type="range"
            min={min}
            max={max}
            value={selection}
            onChange={this.onSelectRevision}
          />
        </div>
        <div className="revision-buttons">
          <button
            className="button button-secondary button-compact"
            onClick={this.onCancelRevision}
          >
            Cancel
          </button>
          <button
            style={revisionButtonStyle}
            className="button button-primary button-compact"
            onClick={this.onAcceptRevision}
          >
            Restore Note
          </button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  isViewingRevisions: state.isViewingRevisions,
});

const { setRevision, setIsViewingRevisions } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  setRevision: revision => dispatch(setRevision({ revision })),
  resetIsViewingRevisions: () => {
    dispatch(setIsViewingRevisions({ isViewingRevisions: false }));
  },
  cancelRevision: () => {
    dispatch(setRevision({ revision: null }));
    dispatch(setIsViewingRevisions({ isViewingRevisions: false }));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(
  onClickOutside(RevisionSelector)
);
