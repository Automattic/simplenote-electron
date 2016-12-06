import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
	showPane as showPaneAction,
	hidePane as hidePaneAction,
} from './state/settings/actions';
import Tags from './icons/tags';

class LayoutChanger extends Component {

	changeLayout = () => {
		const {
			showPane,
			hidePane,
			visiblePanes,
		} = this.props;
		if ( visiblePanes.includes( 'navigation-bar' ) ) {
			hidePane( 'navigation-bar' );
		} else {
			showPane( 'navigation-bar' );
		}
	}

	render() {
		return (
			<button
				title="Change Layout"
				className="button button-borderless layout-changer"
				onClick={ this.changeLayout }
			>
				<Tags />
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

export default connect( mapStateToProps, mapDispatchToProps )( LayoutChanger );
