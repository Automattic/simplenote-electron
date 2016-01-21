import React from 'react'
import SmallSearchIcon from './icons/search-small'

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
		var inputStyle = {
			backgroundImage: 'url(' + "data:image/svg+xml;charset=UTF-8," + <SmallSearchIcon /> + ')'
		};
		
		return (
			<div className="search-field">
				<input style={inputStyle} ref="search" type="text" placeholder={this.props.placeholder} onChange={this.onSearch} />
			</div>
		);
	}
} );
