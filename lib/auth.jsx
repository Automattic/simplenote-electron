import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import classNames from 'classnames';
import { get } from 'lodash';
import SimplenoteLogo from './icons/simplenote';
import Spinner from './components/spinner';

import {
	hasInvalidCredentials,
	hasLoginError,
} from './state/auth/selectors';

export const Auth = React.createClass( {

	propTypes: {
		isAuthenticated: PropTypes.bool,
		isMacApp: PropTypes.bool,
		onAuthenticate: PropTypes.func.isRequired,
	},

	componentDidMount() {
		if ( this.usernameInput ) {
			this.usernameInput.focus();
		}
	},

	render() {
		const { isMacApp } = this.props;
		const submitClasses = classNames( 'button', 'button-primary', { pending: this.props.authPending } );

		return (
			<div className="login">
				{ isMacApp &&
					<div className="login-draggable-area" />
				}
				<form className="login-form" onSubmit={this.onLogin}>
					<div className="login-logo">
						<SimplenoteLogo />
					</div>
					<div className="login-fields theme-color-border theme-color-fg">
						<label className="login-field theme-color-border" htmlFor="login-field-username">
							<span className="login-field-label">Email</span>
							<span className="login-field-control">
								<input
									ref={ ref => this.usernameInput = ref }
									id="login-field-username"
									type="email"
									onKeyDown={ this.onLogin }
								/>
							</span>
						</label>
						<label className="login-field theme-color-border" htmlFor="login-field-password">
							<span className="login-field-label">Password</span>
							<span className="login-field-control">
								<input
									ref={ ref => this.passwordInput = ref }
									id="login-field-password"
									type="password"
									onKeyDown={ this.onLogin }
								/>
							</span>
						</label>
					</div>
					{ this.props.hasInvalidCredentials &&
						<p className="login-auth-message login-auth-failure">The credentials you entered don't match</p>
					}
					{ this.props.hasLoginError &&
						<p className="login-auth-message login-auth-failure">Login failed. Please try again.</p>
					}
					<div className="login-actions">
						<div
							className={ submitClasses }
							onClick={ this.onLogin }
							type="submit"
						>
							{ this.props.authPending
								? <Spinner />
								: 'Log in'
							}
						</div>
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
		if ( event.type === 'keydown' && event.keyCode !== 13 ) {
			return;
		}
		event.preventDefault();

		const username = get( this.usernameInput, 'value' );
		const password = get( this.passwordInput, 'value' );

		if ( ! ( username && password ) ) {
			return;
		}

		this.props.onAuthenticate( username, password );
	},

	onForgot( event ) {
		event.preventDefault();
		window.open( event.currentTarget.href, null, 'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes' );
	},

	onSignUp( event ) {
		event.preventDefault();
		window.open( event.currentTarget.href, null, 'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes' );
	}

} );

const mapStateToProps = state => ( {
	hasInvalidCredentials: hasInvalidCredentials( state ),
	hasLoginError: hasLoginError( state ),
} );

export default connect( mapStateToProps )( Auth );
