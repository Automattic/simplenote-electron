'use strict';
const React = require( 'react/addons' );
var PureRenderMixin = React.addons.PureRenderMixin;

var PlusIcon = React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<polygon points="20,11 13,11 13,4 11,4 11,11 4,11 4,13 11,13 11,20 13,20 13,13 20,13 "/>
			</svg>
		);
	}
} );

module.exports = PlusIcon;
