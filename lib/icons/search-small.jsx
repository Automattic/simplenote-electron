import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
				<path fill="none" d="M0 0h22v22H0z"/>
				<path d="M9 6c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3m0-2a5 5 0 1 0 0 10A5 5 0 0 0 9 4zm5.242 8.828a6.54 6.54 0 0 1-1.414 1.414l3.465 3.465 1.414-1.414-3.465-3.465z"/>
			</svg>
		);
	}
} );
