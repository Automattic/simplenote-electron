import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg className="icon-cross" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
				<path fill="none" d="M0 0h22v22H0z"/>
				<path d="M18.707 4.707l-1.414-1.414L11 9.586 4.707 3.293 3.293 4.707 9.586 11l-6.293 6.293 1.414 1.414L11 12.414l6.293 6.293 1.414-1.414L12.414 11z"/>
			</svg>
		);
	}
} );
