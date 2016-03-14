import React, { PropTypes } from 'react';
import includes from 'lodash/collection/includes';
import ToggleControl from './controls/toggle';
import moment from 'moment';
import CrossIcon from './icons/cross';

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		markdownEnabled: PropTypes.bool,
		onPinNote: PropTypes.func.isRequired,
		onMarkdownNote: PropTypes.func.isRequired,
		onOutsideClick: PropTypes.func.isRequired
	},

	mixins: [
		require( 'react-onclickoutside' )
	],

	handleClickOutside: function() {
		this.props.onOutsideClick( false );
	},

	render: function() {
		const { note, markdownEnabled } = this.props;
		const data = note && note.data || {};
		const { modificationDate } = data;
		const formattedDate = modificationDate && formatTimestamp( modificationDate );
		const isPinned = includes( data.systemTags, 'pinned' );
		const isMarkdown = includes( data.systemTags, 'markdown' );
		const isPublished = includes( data.systemTags, 'published' );
		const publishURL = isPublished && data.publishURL !== '' && data.publishURL && `http://simp.ly/publish/${data.publishURL}` || null;

		return (
			<div className="note-info theme-color-bg theme-color-fg theme-color-border">
				<div className="note-info-panel note-info-stats theme-color-border">
					<div className="note-info-header">
						<h2 className="panel-title theme-color-fg-dim">Info</h2>
						<button type="button" className="about-done button button-borderless" onClick={this.handleClickOutside}>
							<CrossIcon />
						</button>
					</div>
					{ formattedDate &&
						<p className="note-info-item">
							<span className="note-info-item-text">
								<span className="note-info-name">Modified</span>
								<br /><span className="note-info-detail">{formattedDate}</span>
							</span>
						</p>
					}
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">{wordCount( data && data.content )} words</span>
						</span>
					</p>
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">{characterCount( data && data.content )} characters</span>
						</span>
					</p>
				</div>
				<div className="note-info-panel note-info-pin theme-color-border">
					<label className="note-info-item" htmlFor="note-info-pin-checkbox">
						<span className="note-info-item-text">
							<span className="note-info-name">Pin to top</span>
						</span>
						<span className="note-info-item-control">
							<ToggleControl id="note-info-pin-checkbox" checked={isPinned} onChange={this.onPinChanged} />
						</span>
					</label>
				</div>
				{!!markdownEnabled && <div className="note-info-panel note-info-markdown theme-color-border">
					<label className="note-info-item" htmlFor="note-info-markdown-checkbox">
						<span className="note-info-item-text">
							<span className="note-info-name">Markdown</span>
							<br /><span className="note-info-detail">
								Enable markdown formatting on this note. <a target="_blank" href="http://simplenote.com/help/#markdown">Learn more…</a>
							</span>
						</span>
						<span className="note-info-item-control">
							<ToggleControl id="note-info-markdown-checkbox" checked={isMarkdown} onChange={this.onMarkdownChanged} />
						</span>
					</label>
				</div>}
				{ isPublished &&
					<div className="note-info-panel note-info-public-link theme-color-border">
						<p className="note-info-item">
							<span className="note-info-item-text">
								<span className="note-info-name">Public link</span>
								<br /><span className="note-info-detail">{publishURL}</span>
							</span>
						</p>
					</div>
				}
			</div>
		);
	},

	onPinChanged( event ) {
		this.props.onPinNote( this.props.note, event.currentTarget.checked );
	},

	onMarkdownChanged( event ) {
		this.props.onMarkdownNote( this.props.note, event.currentTarget.checked );
	}
} );

function formatTimestamp( unixTime ) {
	return moment.unix( unixTime ).format( 'MMM D, YYYY h:mm a' );
}

function wordCount( content ) {
	return ( ( content || '' ).match( /\b\S+\b/g ) || [] ).length;
}

function characterCount( content ) {
	return [ ...content || '' ].length;
}
