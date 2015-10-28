import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

export default React.createClass( {
	mixins: [ PureRenderMixin ],

	render: function() {
		return (
			<svg version="1.1" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24">
				<path d="M14,10h-1v7h1V10z M11,10h-1v7h1V10z M16,6V5c0-1.1-0.9-2-2-2h-4C8.9,3,8,3.9,8,5v1H5v2h1v11c0,1.1,0.9,2,2,2h8 c1.1,0,2-0.9,2-2V8h1V6H16z M10,5h4v1h-4V5z M16,19H8V8h8V19z"/>
			</svg>
		);
	}
} );
