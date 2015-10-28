'use strict';
const React = require( 'react/addons' );
var PureRenderMixin = React.addons.PureRenderMixin;

var ArrowIcon = React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" viewBox="0 0 24 24" width="24px" height="24px">
				<polygon points="12,15.8 6.3,10.7 7.7,9.3 12,13.2 16.3,9.3 17.7,10.7 "/>
			</svg>
		);
	}
} );

module.exports = ArrowIcon;
