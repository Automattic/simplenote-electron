var React = require('react');

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      onAuthenticate: () => {}
    }
  },

  onSignIn: function() {
    // TODO: perform login request, needs auth client
    var username = this.refs.username.getDOMNode().value;
    var password = this.refs.password.getDOMNode().value;
    this.props.onAuthenticate(username, password)
  },

  render: function() {
    return (
      <div className="login-form">
      	<svg version="1.1" x="0px" y="0px" viewBox="0 0 96 96" width="96" height="96">
	  	  <path d="M45.9,54.9c-21.1-5.8-33.7-21.5-32.1-40c0-0.2,0.1-0.4,0.1-0.6C5.3,22.9,0,34.8,0,48c0,25.3,20.6,47,44.4,47.8 c5.3,0.2,10.5-1.2,14.6-4.7c4.2-3.5,6.7-8.4,7.2-13.8C67.4,63,54,57.1,45.9,54.9z M96,48C96,22.9,76,1.3,52.2,0.2 C47.5,0,42.9,1.3,39.3,4.3c-3.7,3.1-5.9,7.4-6.4,12.2C32,27.3,41.6,33.8,51,36.4c22.6,6.2,35.7,22.2,34.4,41.8 C92,69.9,96,59.4,96,48z" />
		</svg>
        <div>
          <input ref="username" type="text" />
        </div>
        <div>
          <input ref="password" type="password" />
        </div>
        <div>
          <div className="button" onClick={this.onSignIn}>Sign In</div>
        </div>
      </div>
    )
  }

})