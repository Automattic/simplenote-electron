import React from 'react'
import dateFormat from 'dateformat'

export default React.createClass( {

	getDefaultProps: function() {
		return {
			revisions: []
		}
	},

	componentDidMount: function() {
		// Note: this is intentionally not in state so that the UI doesn't update after resetSelection()
		this.selection = -1;
	},

	mixins: [
		require( 'react-onclickoutside' )
	],

	handleClickOutside: function() {
		this.onCancelRevision();
	},

	getInitialState: function() {
		return {
			revisionDate: 'Latest'
		};
	},

	onAcceptRevision: function() {
		const idx = this.selection;
		const revisions = this.props.revisions || [];
		const revision = revisions.slice( -idx ).shift();

		this.props.onSelectRevision( revision );
		this.resetSelection();
	},

	resetSelection: function() {
		this.selection = -1;
	},

	onSelectRevision: function() {
		const idx = this.refs.range.value;
		const revisions = this.props.revisions || [];
		const revision = revisions.slice( -idx ).shift();

		const { data: { modificationDate } } = revision;
		const d = new Date( 1000 * modificationDate );
		const revisionDate = dateFormat( d, 'mmm dd, yyyy h:MM TT' );

		this.selection = idx;
		this.setState( { revisionDate } );
		this.props.onViewRevision( revision );
	},

	onCancelRevision: function() {
		this.props.onCancelRevision();
		this.resetSelection();
	},

	render: function() {
		const min = 0;
		const revisions = this.props.revisions || [];
		const max = Math.max( revisions.length - 1, 1 );
		const selection = this.selection > -1 ? parseInt( this.selection, 10 ) : max;

		let { revisionDate } = this.state;
		// if the last index, use a string instead of the date
		if ( selection === max ) {
			revisionDate = 'Latest';
		}

		const revisionButtonStyle = selection === max ? { opacity: '0.5', pointerEvents: 'none' } : {};

		return (
			<div className="revision-selector">
				<div className="revision-date">{revisionDate}</div>
				<div className="revision-slider">
					<input ref="range" type="range" min={min} max={max} value={selection} onChange={this.onSelectRevision} />
				</div>
				<div className="revision-buttons">
					<div className="button button-secondary button-compact" onClick={this.onCancelRevision}>Cancel</div>
					<div style={revisionButtonStyle} className="button button-primary button-compact" onClick={this.onAcceptRevision}>Restore Note</div>
				</div>
			</div>
		)
	}

} );
