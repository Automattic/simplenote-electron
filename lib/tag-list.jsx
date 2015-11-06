import React from 'react'

require('../scss/tag-list.scss');

export default React.createClass({

	getDefaultProps: function() {
		return {
			onSelectTag: function(){},
			tags: []
		};
	},

	render: function() {
		return (
			<div className="tag-list">
				<h2 className="tag-list-title">Tags</h2>
				<div className="tag-list-items">
					{this.props.tags.map((tag, i) => 
						<div key={i} className="tag-list-item" tabIndex="-1" onClick={this.props.onSelectTag.bind(null, tag)}>
							{tag.data.name}
						</div>
					)}
				</div>
			</div>
		);
	}
});
