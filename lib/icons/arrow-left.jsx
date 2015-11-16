import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
				<path fill="none" d="M0 0h22v22H0z"/>
				<path d="M19 10H6.414l5.293-5.293-1.414-1.414L2.586 11l7.707 7.707 1.414-1.414L6.414 12H19z"/>
			</svg>
		);
	}
} );
