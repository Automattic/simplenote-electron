import React, { PropTypes } from 'react'
import moment from 'moment'
import { orderBy } from 'lodash';

const sortedRevisions = revisions =>
	orderBy( revisions, 'data.modificationDate', 'asc' );

export const RevisionSelector = React.createClass( {
	mixins: [
		require( 'react-onclickoutside' )
	],

	getInitialState() {
		return {
			revisions: sortedRevisions( this.props.revisions ),
			selection: Infinity,
		}
	},

	componentWillReceiveProps( { revisions: nextRevisions } ) {
		const { revisions: prevRevisions } = this.props;

		if ( nextRevisions === prevRevisions ) {
			return;
		}

		this.setState( {
			revisions: sortedRevisions( nextRevisions ),
		} );
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
		const {
			revisions,
			selection,
		} = this.state;

		this.props.onSelectRevision( revisions[ selection ] );
		this.resetSelection();
	},

	resetSelection: function() {
		this.setState( {
			selection: Infinity,
		} );
	},

	onSelectRevision: function( { target: { value } } ) {
		const { revisions } = this.state;

		const selection = parseInt( value, 10 );
		const revision = revisions[ selection ];

		this.setState( {
			selection,
		} );
		this.props.onViewRevision( revision );
	},

	onCancelRevision: function() {
		this.props.onCancelRevision();
		this.resetSelection();
	},

	render: function() {
		const {
			revisions,
			selection: rawSelection,
		} = this.state;

		const min = 0;
		const max = Math.max( revisions.length - 1, 1 );
		const selection = Math.min( rawSelection, max );

		const revisionDate = ( ! revisions.length ) || ( selection === max )
			? 'Latest'
			: moment
				.unix( revisions[ selection ].data.modificationDate )
				.format( 'MMM D, YYYY h:mm a' );

		const revisionButtonStyle = selection === max
			? { opacity: '0.5', pointerEvents: 'none' }
			: {};

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

RevisionSelector.propTypes = {
	revisions: PropTypes.array.isRequired,
};

export default RevisionSelector;
