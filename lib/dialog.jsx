import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass( {

	propTypes: {
		title: PropTypes.string,
		onDone: PropTypes.func
	},

	componentDidMount() {
		this.previouslyActiveElement = document.activeElement;
		this.focusFirstInput( this.refs.content );
		this.startListening();
	},

	componentWillUnmount() {
		this.stopListening();
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

	interceptClick( event ) {
		if ( 'dialog' !== event.srcElement.getAttribute( 'role' ) ) {
			return;
		}

		event.preventDefault();
		this.props.onDone();
	},

	queryAllEnabledControls( parent ) {
		return ( parent || this.refs.box ).querySelectorAll( 'button:enabled, input:enabled, textarea:enabled' );
	},

	startListening() {
		window.addEventListener( 'click', this.interceptClick );
	},

	stopListening() {
		window.removeEventListener( 'click', this.interceptClick );
	},

	render() {
		var { className, title, children, onDone } = this.props;
		var titleElementId = `dialog-title-${ title }`;

		return (
			<div className={classNames( 'dialog', className ) } role="dialog" aria-labelledby={titleElementId}>
				<input type="text" className="focus-guard" onFocus={() => this.focusLastInput()} />

				<div ref="box" className="dialog-box theme-color-bg theme-color-fg theme-color-border">
					{( title != null && onDone != null ) &&
						<div className="dialog-title-bar theme-color-border">
							<div className="dialog-title-side"></div>
							<h2 id={titleElementId} className="dialog-title-text">{title}</h2>
							<div className="dialog-title-side">
								{!!onDone && <button type="button" className="button button-borderless" onClick={onDone}>Done</button>}
							</div>
						</div>
					}

					<div ref="content" className="dialog-content">
						{children}
					</div>
				</div>

				<input type="text" className="focus-guard" onFocus={() => this.focusFirstInput()} />
			</div>
		);
	}

} );
