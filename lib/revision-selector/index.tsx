import React, { CSSProperties, Component, ChangeEventHandler } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';
import format from 'date-fns/format';
import { orderBy } from 'lodash';
import classNames from 'classnames';
import Slider from '../components/slider';
import appState from '../flux/app-state';
import { updateNoteTags } from '../state/domain/notes';

import { NoteEntity } from '../types';

const sortedRevisions = (revisions: NoteEntity[]) =>
  orderBy(revisions, 'version', 'asc');

type Props = {
  isViewingRevisions: boolean;
  note: NoteEntity;
  revisions: NoteEntity[];
  onUpdateContent: Function;
  setRevision: Function;
  resetIsViewingRevisions: Function;
  cancelRevision: Function;
  updateNoteTags: Function;
};

type State = {
  revisions: NoteEntity[];
  selection: number;
};

export class RevisionSelector extends Component<Props, State> {
  constructor(props: Props, ...args: unknown[]) {
    super(props, ...args);

    this.state = {
      revisions: sortedRevisions(props.revisions),
      selection: Infinity,
    };
  }

  componentWillReceiveProps({ revisions: nextRevisions }: Props) {
    const { revisions: prevRevisions } = this.props;

    if (nextRevisions === prevRevisions) {
      return;
    }

    this.setState({
      revisions: sortedRevisions(nextRevisions),
    });
  }

  componentDidUpdate({ revisions: prevRevisions }: Props) {
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
      const {
        data: { content, tags },
      } = revision;

      onUpdateContent(note, content, true);
      this.props.updateNoteTags({ note, tags });
      resetIsViewingRevisions();
    }
    this.resetSelection();
  };

  resetSelection = () => this.setState({ selection: Infinity });

  onSelectRevision: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    const { revisions } = this.state;

    const selection = parseInt(value, 10);
    const revision = revisions[selection];

    this.setState({ selection });
    this.props.setRevision(revision);
  };

  onCancelRevision = () => {
    this.props.cancelRevision();
    this.resetSelection();
  };

  render() {
    const { isViewingRevisions } = this.props;

    if (!isViewingRevisions) {
      return null;
    }

    const { revisions, selection: rawSelection } = this.state;
    const min = 0;
    const max = Math.max(revisions.length - 1, 1);
    const selection = Math.min(rawSelection, max);

    const revisionDate =
      !revisions.length || selection === max
        ? 'Latest'
        : format(
            revisions[selection].data.modificationDate * 1000,
            'MMM d, yyyy h:mm a'
          );

    const revisionButtonStyle: CSSProperties =
      selection === max ? { opacity: '0.5', pointerEvents: 'none' } : {};

    const mainClasses = classNames('revision-selector', {
      'is-visible': isViewingRevisions,
    });

    return (
      <div className={mainClasses}>
        <div className="revision-date">{revisionDate}</div>
        <div className="revision-slider">
          <Slider
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
  updateNoteTags: arg => dispatch(updateNoteTags(arg)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(onClickOutside(RevisionSelector));
