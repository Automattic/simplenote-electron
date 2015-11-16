import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
				<path fill="none" d="M0 0h22v22H0z"/>
				<path d="M11 4c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.14-7-7 3.14-7 7-7m0-2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 8h-2v6h2v-6zm-1-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
			</svg>
		);
	}
} );
