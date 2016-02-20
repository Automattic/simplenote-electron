import React from 'react';

// Simple wrapper that tracks small screen state
export default function browserShell( Component ) {
	return React.createClass( {
		getInitialState: function() {
			return {
				windowWidth: 1024,
				isSmallScreen: false
			};
		},

		componentDidMount: function() {
			window.addEventListener( 'resize', this.updateWindowSize );
		},

		componentWillUnmount: function() {
			window.removeEventListener( 'resize', this.updateWindowSize );
		},

		updateWindowSize: function() {
			const { innerWidth } = window;

			// Magic number here corresponds to $single-column value in variables.scss
			this.setState( {
				windowWidth: innerWidth,
				isSmallScreen: innerWidth <= 750
			} );
		},

		render: function() {
			return <Component { ...this.state } { ...this.props } />
		}
	} );
}
