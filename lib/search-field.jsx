import React, { PropTypes } from 'react'

export default React.createClass( {

	propTypes: {
		placeholder: PropTypes.string.isRequired,
		searchFocus: PropTypes.bool.isRequired,
		onSearch: PropTypes.func.isRequired,
		onSearchFocused: PropTypes.func.isRequired
	},

	getDefaultProps: function() {
		return {
			placeholder: 'Search',
			onSearch: function() {}
		}
	},

	componentDidUpdate: function() {
		const { searchFocus, onSearchFocused } = this.props;
		const { search } = this.refs;
		if ( searchFocus ) {
			search.focus();
			onSearchFocused();
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
