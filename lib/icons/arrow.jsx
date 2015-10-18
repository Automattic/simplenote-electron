'use strict';
const React = require( 'react/addons' );
var PureRenderMixin = React.addons.PureRenderMixin;

var ArrowIcon = React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<polygon points="9.4,10 11.7,7.7 10.3,6.3 5.6,11 10.3,15.7 11.7,14.3 9.4,12 17,12 17,18 19,18 19,10 "/>
			</svg>
		);
	}
} );

module.exports = ArrowIcon;
