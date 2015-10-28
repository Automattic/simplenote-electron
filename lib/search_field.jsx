var React = require('react');

module.exports = React.createClass({

	getDefaultProps: function() {
		return {
			onSearch: function() {}
		}
	},

	onSearch: function(e) {
		var query = this.refs.search.getDOMNode().value;
		this.props.onSearch(query);
	},

	render: function() {
		return (
			<div className="search-field">
				<input ref="search" type="text" placeholder="Search" onChange={this.onSearch} />
			</div>
		);
	}
});