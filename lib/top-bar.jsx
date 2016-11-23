import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux'

import { setRevisionState } from './state/revisions/actions';
import { toggleLayoutType } from './state/settings/actions'
import NewNoteIcon from './icons/new-note';
import NoteToolbar from './note-toolbar';

class TopBar extends Component {

	static propTypes = {
		layoutType: PropTypes.string,
		revisionState: PropTypes.object,
		onToggle: PropTypes.func,
		onRevisionChange: PropTypes.func,
		note: PropTypes.object,
		onNewNote: PropTypes.func,
		onTrashNote: PropTypes.func,
		onRestoreNote: PropTypes.func,
		onShareNote: PropTypes.func,
		onDeleteNoteForever: PropTypes.func,
		onRevisions: PropTypes.func,
		onCloseNote: PropTypes.func,
		onNoteInfo: PropTypes.func,
	}

	toggleIcon() {
		switch ( this.props.layoutType ) {
			case '3-col' : return '3 COLUMNS';
			case '2-col' : return '2 COLUMNS';
			case '1-col' : return 'EDITOR';
		}
	}

	onToggleLayoutType = () => {
		const { layoutType, onToggle } = this.props;

		switch ( layoutType ) {
			case '3-col' : onToggle( '2-col' ); break;
			case '2-col' : onToggle( '1-col' ); break;
			case '1-col' : onToggle( '3-col' ); break;
			default : onToggle( '3-col' );
		}
	}

	setIsViewingRevisions = isViewingRevisions => {
		this.props.onRevisionChange( { isViewingRevisions } );
	}

	render() {
		return (
			<div className="top-bar">
				<div className="top-bar-left">
					<button type="button" className="button button-borderless" onClick={ this.onToggleLayoutType }>
						{ this.toggleIcon() }
					</button>
					<button type="button" className="button button-borderless" onClick={ this.props.onNewNote }>
						<NewNoteIcon />
					</button>
				</div>
				<div className="top-bar-right">
					<NoteToolbar
						note={ this.props.note }
						onTrashNote={ this.props.onTrashNote }
						onRestoreNote={ this.props.onRestoreNote }
						onShareNote={ this.props.onShareNote }
						onDeleteNoteForever={ this.props.onDeleteNoteForever }
						onRevisions={ this.props.onRevisions }
						setIsViewingRevisions={ this.setIsViewingRevisions }
						onCloseNote={ this.props.onCloseNote }
						onNoteInfo={ this.props.onNoteInfo }
					/>
				</div>
			</div>
		);
	}

}

const mapStateToProps = ( { revisions, settings } ) => ( {
	layoutType: settings.layoutType,
	revisionState: revisions.revisionState,
} );

const mapDispatchToProps = dispatch => ( {
	onToggle: layoutType => {
		dispatch( toggleLayoutType( layoutType ) );
	},
	onRevisionChange: revisionState => {
		dispatch( setRevisionState( revisionState ) );
	},
} );

export default connect( mapStateToProps, mapDispatchToProps )( TopBar );
