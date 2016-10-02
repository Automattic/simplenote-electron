import React from 'react'
import moment from 'moment'

export default React.createClass( {

	mixins: [
		require( 'react-onclickoutside' )
	],

	getDefaultProps: function() {
		return {
			revisions: []
		}
	},

	getInitialState() {
		return {
			selection: Infinity,
		}
	},

	componentDidUpdate( { revisions: prevRevisions } ) {
		const { revisions: nextRevisions } = this.props;

		if ( prevRevisions !== nextRevisions ) {
			// I'm not sure why exactly, but
			// this control wasn't refreshing
			// after loading in the revisions
			// the first time.
			//
			// This led to the 'Latest' revision
			// being in position 1 instead of
			// on the far right.
			//
			// This forces the refresh to correct
			// things until we figure out what's
			// really causing the problem.
			this.forceUpdate();
		}
	},

	handleClickOutside: function() {
		this.onCancelRevision();
	},

	onAcceptRevision: function() {
		const idx = this.state.selection;
		const revisions = this.sortedRevisions();
		const revision = revisions[ idx ];

		this.props.onSelectRevision( revision );
		this.resetSelection();
	},

	resetSelection: function() {
		this.setState( {
			selection: Infinity,
		} );
	},

	onSelectRevision: function( { target: { value } } ) {
		const selection = parseInt( value, 10 );
		const revision = this.sortedRevisions()[ selection ];

		this.setState( {
			selection,
		} );
		this.props.onViewRevision( revision );
	},

	onCancelRevision: function() {
		this.props.onCancelRevision();
		this.resetSelection();
	},

	sortedRevisions() {
		return this.props.revisions
			.slice()
			.sort( ( a, b ) => a.data.modificationDate - b.data.modificationDate );
	},

	render: function() {
		const min = 0;
		const revisions = this.sortedRevisions();
		const max = Math.max( revisions.length - 1, 1 );
		const selection = Math.min( this.state.selection, max );

		const revisionDate = ( ! revisions.length ) || ( selection === max )
			? 'Latest'
			: moment
				.unix( revisions[ selection ].data.modificationDate )
				.format( 'MMM D, YYYY h:mm a' );

		const revisionButtonStyle = selection === max ? { opacity: '0.5', pointerEvents: 'none' } : {};

		return (
			<div className="revision-selector">
				<div className="revision-date">{revisionDate}</div>
				<div className="revision-slider">
					<input
						type="range"
						min={min}
						max={max}
						value={selection}
						onChange={this.onSelectRevision}
					/>
				</div>
				<div className="revision-buttons">
					<div className="button button-secondary button-compact" onClick={this.onCancelRevision}>Cancel</div>
					<div style={revisionButtonStyle} className="button button-primary button-compact" onClick={this.onAcceptRevision}>Restore Note</div>
				</div>
			</div>
		)
	}

} );
