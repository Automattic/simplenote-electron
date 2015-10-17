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
      <div>
        <input ref="username" type="text" />
        <input ref="password" type="password" />
        <div onClick={this.onSignIn}>Sign In</div>
      </div>
    )
  }

})