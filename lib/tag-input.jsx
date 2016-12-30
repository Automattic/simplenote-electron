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

	componentWillUnmount() {
		this.inputField && this.inputField.removeEventListener( 'paste', this.removePastedFormatting, false );
	}

	focusInput = () => {
		if ( ! this.inputField ) {
			return;
		}

		const input = this.inputField;

		input.focus();
		const range = document.createRange();
		range.selectNodeContents( input );
		range.collapse( false );
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange( range );
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
			onChange( suggestion, this.focusInput );
		}

		event.preventDefault();
		event.stopPropagation();
	};

	onChange = ( { target: { textContent: value } } ) =>
		value.endsWith( ',' ) && value.trim().length // commas should automatically insert non-zero tags
			? this.props.onSelect( value.slice( 0, -1 ).trim() )
			: this.props.onChange( value.trim() );

	removePastedFormatting = event => {
		document.execCommand(
			'insertHTML',
			false, // don't show default UI - see execCommand docs for explanation
			event.clipboardData.getData( 'text/plain' ),
		);

		event.preventDefault();
		event.stopPropagation();
	};

	storeInput = ref => {
		this.inputField = ref;
		this.props.inputRef( ref );
		this.inputField.addEventListener( 'paste', this.removePastedFormatting, false );
	};

	submitTag = event => {
		const { onSelect, value } = this.props;

		value.trim().length && onSelect( value.trim() );

		event.preventDefault();
		event.stopPropagation();
	};

	render() {
		const {
			value,
			tagNames,
		} = this.props;

		const suggestion = value.length && tagNames.find( startsWith( value ) );

		return (
			<div className="tag-input"
				onClick={ this.focusInput }
			>
				<div
					ref={ this.storeInput }
					className="tag-input__entry"
					contentEditable="true"
					onInput={ this.onChange }
					onKeyDown={ this.interceptKeys }
					placeholder="Enter a tag name…"
				>
					{ value }
				</div>
				<div
					className="tag-input__suggestion"
					disabled
					type="text"
				>
					{ suggestion ? suggestion.substring( value.length ) : '' }
				</div>
			</div>
		);
	}
}

export default TagInput;
