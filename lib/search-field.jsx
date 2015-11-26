import React from 'react'

export default React.createClass( {

	getDefaultProps: function() {
		return {
			placeholder: 'Search',
			onSearch: function() {}
		}
	},

	onSearch: function() {
		var query = this.refs.search.value;
		this.props.onSearch( query );
	},

	render: function() {
		return (
			<div className="search-field">
				<input ref="search" type="text" placeholder={this.props.placeholder} onChange={this.onSearch} />
			</div>
		);
	}
} );
