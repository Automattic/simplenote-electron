import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<polygon points="16.4,1.3 17.8,2.7 9.4,12 17.8,21.3 16.4,22.7 6.8,12 "/>
			</svg>
		);
	}
} );
