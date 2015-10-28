import React from 'react'

export default React.createClass({

	getDefaultProps: function() {
		return {
			revisions: [],
			onSelectRevision: function() {},
			onViewRevision: function() {}
		}
	},

	getInitialState: function() {
		return {
			selection: -1
		};
	},

	onAcceptRevision: function() {
		var idx = this.state.selection;
		var revision = this.props.revisions[this.props.revisions.length - 1 - idx];
		this.props.onSelectRevision(revision);
	},

	onSelectRevision: function() {
		var idx = this.refs.range.getDOMNode().value;
		this.setState({selection: idx});
		var revision = this.props.revisions[this.props.revisions.length - 1 - idx];
		this.props.onViewRevision(revision);
	},

	render: function() {
		var min = 0;
		var max = this.props.revisions.length-1;
		var selection = this.state.selection && this.state.selection > -1 ? this.state.selection : max;
		return (
			<div className="revision-selector">
				<input ref="range" type="range" min={min} max={max} value={selection} onChange={this.onSelectRevision} />
				<div className="textbutton" onClick={this.onAcceptRevision}>Restore</div>
			</div>
		)
	}

});