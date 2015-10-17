'use strict';
const React = require( 'react/addons' );
var PureRenderMixin = React.addons.PureRenderMixin;

var InfoIcon = React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<path d="M11,17h2v-7h-2V17z M11,9h2V7h-2V9z M12,3c-5,0-9,4-9,9s4,9,9,9s9-4,9-9S17,3,12,3z M12,19.5c-4.1,0-7.5-3.4-7.5-7.5 S7.9,4.5,12,4.5s7.5,3.4,7.5,7.5S16.1,19.5,12,19.5z"/>
			</svg>
		);
	}
} );

module.exports = InfoIcon;
