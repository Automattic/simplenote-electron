import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
	showPane as showPaneAction,
	hidePane as hidePaneAction,
} from './state/settings/actions';
import ThreePanesIcon from './icons/three-panes';
import TwoPanesIcon from './icons/two-panes';
import EditorOnlyIcon from './icons/editor-only';

class ChangeLayout extends Component {

	changeLayout = () => {
		const {
			showPane,
			hidePane,
			visiblePanes,
		} = this.props;
		if ( visiblePanes.includes( 'navigation-bar' ) ) {
			hidePane( 'navigation-bar' );
		} else if ( visiblePanes.includes( 'note-list' ) ) {
			hidePane( 'note-list' );
		} else {
			showPane( 'note-list' );
			showPane( 'navigation-bar' );
		}
	}

	render() {
		const { visiblePanes } = this.props;
		return (
			<button
				title="Change Layout"
				className="button button-borderless"
				onClick={ this.changeLayout }
			>
				{ visiblePanes.includes( 'navigation-bar' ) &&
					<TwoPanesIcon />
				}
				{ ! visiblePanes.includes( 'navigation-bar' ) && visiblePanes.includes( 'note-list' ) &&
					<EditorOnlyIcon />
				}
				{ ! visiblePanes.includes( 'note-list' ) && ! visiblePanes.includes( 'navigation-bar' ) &&
					<ThreePanesIcon />
				}
			</button>
		);
	}
}

const mapStateToProps = ( { settings: { visiblePanes } } ) => ( {
	visiblePanes,
} );

const mapDispatchToProps = dispatch => ( {
	showPane: pane => dispatch( showPaneAction( pane ) ),
	hidePane: pane => dispatch( hidePaneAction( pane ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( ChangeLayout );
