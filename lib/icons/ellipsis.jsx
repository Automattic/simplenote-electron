'use strict';
const React = require( 'react/addons' );
var PureRenderMixin = React.addons.PureRenderMixin;

var EllipsisIcon = React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<path d="M4,10c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S5.1,10,4,10z M20,10c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S21.1,10,20,10z M12,10c-1.1,0-2,0.9-2,2s0.9,2,2,2s2-0.9,2-2S13.1,10,12,10z"/>
			</svg>
		);
	}
} );

module.exports = EllipsisIcon;
