var React = require('react');

const PlusIcon = require( './icons/plus.jsx' );
const BackIcon = require( './icons/back.jsx' );

module.exports = React.createClass({

  getDefaultProps: function() {
    return {
      title: ""
    };
  },

  onNavigateBack: function() {
    
  },

  render: function() {
    return (
      <div className="navigation-bar">
        <div className="button" tabIndex="-1" onClick={this.onNavigateBack}><BackIcon /></div>
        <div>{this.props.title}</div>
				{this.props.children}
      </div>
    );
  }
});