import React, { PropTypes } from 'react'
import SimplenoteLogo from './icons/simplenote';

export default React.createClass( {

	propTypes: {
		onAuthenticate: PropTypes.func.isRequired
	},

	componentDidMount() {
		this.refs.username.focus();
	},

	render() {
		return (
			<div className="login">
				<form className="login-form" onSubmit={this.onLogin}>
					<div className="login-logo">
						<SimplenoteLogo />
					</div>
					<div className="login-fields color-border">
						<label className="login-field color-border" htmlFor="login-field-username">
							<span className="login-field-label">Email</span>
							<span className="login-field-control"><input ref="username" id="login-field-username" type="email" /></span>
						</label>
						<label className="login-field color-border" htmlFor="login-field-password">
							<span className="login-field-label">Password</span>
							<span className="login-field-control"><input ref="password" id="login-field-password" type="password" /></span>
						</label>
					</div>
					<div className="login-actions">
						<button type="submit" className="button button-primary">Log in</button>
						<p className="login-forgot">
							<a href="https://app.simplenote.com/forgot/" target="_blank" onClick={this.onForgot}>Forgot your password?</a>
						</p>
						<p className="login-signup">
							Don't have an account?
							{' '}<a href="https://app.simplenote.com/signup/" target="_blank" onClick={this.onSignUp}>Sign up</a>
						</p>
					</div>
				</form>
			</div>
		)
	},

	onLogin( event ) {
		event.preventDefault();

		this.props.onAuthenticate(
			this.refs.username.value,
			this.refs.password.value
		)
	},

	onForgot( event ) {
		event.preventDefault();
		window.open( event.currentTarget.href, null, 'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes' );
	},

	onSignUp( event ) {
		event.preventDefault();
		window.open( event.currentTarget.href, null, 'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes' );
	}

} )
