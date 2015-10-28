import React from 'react'

export default React.createClass({

	getDefaultProps: function() {
		return {
			tags: [],
			defaultLabel: 'Tags'
		};
	},

	render: function() {
		var label = this.props.defaultLabel;
		return (
			<div className="tag-menu">
				<span key="label" tabIndex="1" className="tag-menu-label">{label}</span>
				<div key="menu" className="tag-menu-options">
					{this.props.children}
				</div>
			</div>
		)
	}
})