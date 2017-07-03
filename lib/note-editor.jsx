import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'
import marked from 'marked'
import { get } from 'lodash'
import appState from './flux/app-state';
import getNote from './utils/get-note';
import ModeBar from './mode-bar';
import { selectRevision } from './state/revision/actions';

const { setShouldPrintNote } = appState.actionCreators;

export const NoteEditor = React.createClass( {
	propTypes: {
		shouldPrint: PropTypes.bool,
		onPrintNote: PropTypes.func
	},

	getDefaultProps: function() {
		return {
			note: {
				data: {
					tags: []
				}
			}
		};
	},

	componentWillMount: function() {
		this.props.onCancelRevision();
	},

	componentDidUpdate: function() {
		// Immediately print once `shouldPrint` has been set
		if ( this.props.shouldPrint ) {
			window.print();
			this.props.onNotePrinted();
		}
	},

	render: function() {
		let noteContent = '';
		const {
			fontSize,
			isTrashed,
			markdownEnabled,
			noteBucket,
			revision,
			selectedRevision,
			shouldPrint,
			tagBucket,
		} = this.props;

		const classes = classNames( 'note-editor', 'theme-color-bg', 'theme-color-fg', {
			revisions: selectedRevision,
			markdown: markdownEnabled
		} );

		if ( shouldPrint ) {
			const content = get( revision, 'data.content', '' );
			noteContent = markdownEnabled ? marked( content ) : content;
		}

		const printStyle = {
			fontSize: fontSize + 'px'
		};

		return (
			<div className={classes}>
				<RevisionSelector noteBucket={ noteBucket } />
				<div className="note-editor-controls theme-color-border">
					<NoteToolbar noteBucket={ noteBucket } />
				</div>
				<div className="note-editor-content theme-color-border">
					{ !! markdownEnabled &&
						<ModeBar />
					}
					<div className="note-editor-detail">
						<NoteDetail noteBucket={ noteBucket } />
					</div>
				</div>
				{ shouldPrint &&
					<div style={printStyle} className="note-print note-detail-markdown"
					dangerouslySetInnerHTML={ { __html: noteContent } } />
				}
				{ ! isTrashed &&
					<TagField noteBucket={ noteBucket } tagBucket={ tagBucket } />
				}
			</div>
		)
	},
} );

const mapStateToProps = ( {
	appState: state,
	revision: { selectedRevision },
	settings: { fontSize },
} ) => {
	const note = getNote( state );
	const revision = selectedRevision || note;
	return {
		fontSize,
		isTrashed: !! ( note && note.data.deleted ),
		markdownEnabled: get( revision, 'data.systemTags', '' ).indexOf( 'markdown' ) !== -1,
		revision,
		selectedRevision,
		shouldPrint: state.shouldPrint,
	};
};

const mapDispatchToProps = dispatch => ( {
	onCancelRevision: () => dispatch( selectRevision( null ) ),
	onNotePrinted: () =>
		dispatch( setShouldPrintNote( { shouldPrint: false } ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteEditor );
