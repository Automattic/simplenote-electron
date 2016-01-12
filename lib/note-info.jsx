import React, { PropTypes } from 'react';
import includes from 'lodash/collection/includes';
import ToggleControl from './controls/toggle';

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
		const isPinned = includes( data.systemTags, 'pinned' );
		const isMarkdown = includes( data.systemTags, 'markdown' );
		const isPublished = includes( data.systemTags, 'published' );
		const publishURL = isPublished && data.publishURL !== '' && data.publishURL && `http://simp.ly/publish/${data.publishURL}` || null;

		return (
			<div className="note-info color-bg color-fg color-border">
				<div className="note-info-panel note-info-stats color-border">
					<h2 className="panel-title color-fg-dim">Info</h2>
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">Created</span>
							<br /><span className="note-info-detail">{formatTimestamp( data && data.creationDate )}</span>
						</span>
					</p>
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">Modified</span>
							<br /><span className="note-info-detail">{formatTimestamp( data && data.modificationDate )}</span>
						</span>
					</p>
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
				<div className="note-info-panel note-info-pin color-border">
					<label className="note-info-item" htmlFor="note-info-pin-checkbox">
						<span className="note-info-item-text">
							<span className="note-info-name">Pin to top</span>
						</span>
						<span className="note-info-item-control">
							<ToggleControl id="note-info-pin-checkbox" checked={isPinned} onChange={this.onPinChanged} />
						</span>
					</label>
				</div>
				{!!markdownEnabled && <div className="note-info-panel note-info-markdown color-border">
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
				<div className="note-info-panel note-info-public-link color-border">
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">Public link</span>
							<br /><span className="note-info-detail">{publishURL}</span>
						</span>
					</p>
				</div>
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

function formatTimestamp( time ) {
	if ( time ) {
		let d = new Date( 1000 * time );
		return d.toLocaleString();
	}
}

function wordCount( content ) {
	return ( ( content || '' ).match( /\b\S+\b/g ) || [] ).length;
}

// https://mathiasbynens.be/notes/javascript-unicode
const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
function characterCount( content ) {
	return ( content || '' )
		// replace every surrogate pair with a BMP symbol
		.replace( surrogatePairs, '_' )
		// then get the length
		.length;
}
