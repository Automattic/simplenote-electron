import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

import { getSelectedCollection } from './state/ui/selectors';

const KEY_ESC = 27;

export class SearchField extends Component {
	static propTypes = {
		placeholder: PropTypes.string.isRequired,
		query: PropTypes.string.isRequired,
		searchFocus: PropTypes.bool.isRequired,
		onSearch: PropTypes.func.isRequired,
		onSearchFocused: PropTypes.func.isRequired
	};

	componentDidUpdate() {
		const { searchFocus, onSearchFocused } = this.props;

		if ( searchFocus && this.searchField ) {
			searchField.focus();
			onSearchFocused();
		}
	}

	interceptEsc = ( { keyCode } ) =>
		KEY_ESC === keyCode
			? this.props.onSearch( '' )
			: null;

	storeInput = r => this.inputField = r;

	update = ( { target: { value: query } } ) => this.props.onSearch( query );

	render() {
		const {
			placeholder,
			query,
		} = this.props;

		return (
			<div className="search-field">
				<input
					ref={ this.storeInput }
					type="text"
					placeholder={ placeholder }
					onChange={ this.update }
					onKeyUp={ this.interceptEsc }
					value={ query }
				/>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { appState } = state;

	return {
		query: appState.filter,
		placeholder: appState.listTitle || getSelectedCollection( state ),
		searchFocus: appState.searchFocus,
	}
};

export default connect( mapStateToProps )( SearchField );
