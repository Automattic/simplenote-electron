import React, { PropTypes } from 'react';
import classNames from 'classnames';
import Dialog from './dialog';

export default React.createClass( {

	propTypes: {
		tabs: PropTypes.array.isRequired,
		renderTabName: PropTypes.func.isRequired,
		renderTabContent: PropTypes.func.isRequired
	},

	componentWillMount() {
		this.setState( {
			currentTab: this.props.tabs[0]
		} );
	},

	setCurrentTab( tab ) {
		this.setState( {
			currentTab: tab
		} );
	},

	render() {
		var { tabs, renderTabName, renderTabContent, ...dialog } = this.props;
		var { currentTab } = this.state;

		return (
			<Dialog className="settings" {...dialog}>
				<nav className="dialog-tabs theme-color-border">
					<ul>
						{ tabs.map( ( tab, key ) =>
							<li key={ key }>
								<button
									type="button"
									className={ classNames( 'button button-borderless', { 'dialog-tab-active': tab === currentTab } ) }
									onClick={ this.setCurrentTab.bind( this, tab ) }
								>
									{ renderTabName( tab ) }
								</button>
							</li>
						) }
					</ul>
				</nav>

				<div className="dialog-tab-content">
					{ renderTabContent( this.state.currentTab ) }
				</div>
			</Dialog>
		);
	}

} );
