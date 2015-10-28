var React = require('react');
import classNames from 'classnames'

module.exports = React.createClass({

	getDefaultProps: function() {
		return {
			tag: '',
			selected: false,
			onSelect: function() {}
		};
	},

	onClick: function(e) {
		e.preventDefault();
		this.props.onSelect(e);
	},

	render: function() {
		return (
			<a
				className={classNames('tag-chip', {selected: this.props.selected})}
				href="#"
				onClick={this.onClick}>
				{this.props.tag}
			</a>
		)
	}
});