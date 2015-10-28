var React = require('react');

const PlusIcon = require( './icons/plus.jsx' );
const BackIcon = require( './icons/back.jsx' );
import DownArrowIcon from './icons/down_arrow'

module.exports = React.createClass({

	getDefaultProps: function() {
		return {
			title: "",
			onDisplayTags: function(){}
		};
	},

	onNavigateBack: function() {
	},

	render: function() {
		return (
			<div className="navigation-bar">
				<div></div>
				<div className="tag-switcher"
						tabIndex="-1"
						onClick={this.props.onDisplayTags}>
					<div>{this.props.title}</div>
					<div style={{width: "24px", height: "24px", top: '1px', position: 'relative'}}><DownArrowIcon /></div>
				</div>
				{this.props.children}
			</div>
		);
	}
});