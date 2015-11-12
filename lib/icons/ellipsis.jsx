import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
		<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
		    <path fill="none" d="M0 0h22v22H0z"/>
		    <path d="M9 11a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
		</svg>
		);
	}
} );
