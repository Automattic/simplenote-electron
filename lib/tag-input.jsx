import React, { Component, PropTypes } from 'react';
import {
	identity,
	invoke,
} from 'lodash';

const KEY_TAB = 9;
const KEY_ENTER = 13;

const startsWith = prefix => text =>
	text
		.trim()
		.toLowerCase()
		.startsWith( prefix.trim().toLowerCase() );

export class TagInput extends Component {
	static propTypes = {
		inputRef: PropTypes.func,
		onChange: PropTypes.func,
		onSelect: PropTypes.func,
		tagNames: PropTypes.arrayOf( PropTypes.string ).isRequired,
		value: PropTypes.string.isRequired,
	};

	static defaultProps = {
		inputRef: identity,
		onChange: identity,
		onSelect: identity,
	};

	interceptKeys = event => invoke( {
		[ KEY_ENTER ]: this.submitTag,
		[ KEY_TAB ]: this.interceptTabPress,
	}, event.keyCode, event );

	interceptTabPress = event => {
		const { onChange, tagNames, value } = this.props;

		if ( ! value.length ) {
			return;
		}

		const suggestion = tagNames.find( startsWith( value ) );

		if ( suggestion ) {
			onChange( suggestion );
		}

		event.preventDefault();
		event.stopPropagation();
	};

	onChange = ( { target: { value } } ) =>
		value.endsWith( ',' ) // commas should automatically insert the tag
			? this.props.onSelect( value.slice( 0, -1 ).trim() )
			: this.props.onChange( value );

	submitTag = event => {
		const { onSelect, value } = this.props;

		onSelect( value.trim() );

		event.preventDefault();
		event.stopPropagation();
	};

	render() {
		const {
			inputRef,
			value,
			tagNames,
		} = this.props;

		const suggestion = value.length && tagNames.find( startsWith( value ) );

		return (
			<div className="tag-input">
				<input
					ref={ inputRef }
					className="tag-input__entry"
					type="text"
					value={ value }
					onChange={ this.onChange }
					onKeyDown={ this.interceptKeys }
				/>
				<input
					className="tag-input__suggestion"
					type="text"
					value={ suggestion ? suggestion : '' }
				/>
			</div>
		);
	}
}

export default TagInput;
