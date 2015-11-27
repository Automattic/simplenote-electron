import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass( {

	propTypes: {
		key: PropTypes.string.isRequired,
		title: PropTypes.string,
		onDone: PropTypes.func
	},

	componentDidMount() {
		this.previouslyActiveElement = document.activeElement;
		this.focusFirstInput( this.refs.content );
	},

	componentWillUnmount() {
		if ( this.previouslyActiveElement != null ) {
			this.previouslyActiveElement.focus();
			this.previouslyActiveElement = null;
		}
	},

	focusFirstInput( parent ) {
		var inputs = this.queryAllEnabledControls( parent );
		var input = inputs[0];

		if ( input != null ) {
			input.focus();
		}
	},

	focusLastInput( parent ) {
		var inputs = this.queryAllEnabledControls( parent );
		var input = inputs[ inputs.length - 1 ];

		if ( input != null ) {
			input.focus();
		}
	},

	queryAllEnabledControls( parent ) {
		return ( parent || this.refs.box ).querySelectorAll( 'button:enabled, input:enabled, textarea:enabled' );
	},

	render() {
		var { key, className, title, children, onDone } = this.props;
		var titleElementId = `dialog-title-${key}`;

		return (
			<div className={classNames( 'dialog', className ) } role="dialog" aria-labelledby={titleElementId}>
				<input type="text" className="focus-guard" onFocus={() => this.focusLastInput()} />

				<div ref="box" className="dialog-box">
					<div className="dialog-title-bar">
						<div className="dialog-title-side"></div>
						<h2 id={titleElementId} className="dialog-title-text">{title}</h2>
						<div className="dialog-title-side">
							{!!onDone && <button type="button" className="text-button" onClick={onDone}>Done</button>}
						</div>
					</div>

					<div ref="content" className="dialog-content">
						{children}
					</div>
				</div>

				<input type="text" className="focus-guard" onFocus={() => this.focusFirstInput()} />
			</div>
		);
	}

} );
