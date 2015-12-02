import React, { PropTypes } from 'react'
import ToggleControl from './controls/toggle'

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		onPinNote: PropTypes.func.isRequired,
		onMarkdownNote: PropTypes.func.isRequired
	},

	render: function() {
		var note = this.props.note;
		var data = note && note.data;
		var systemTags = data && data.systemTags || [];

		return (
			<div className="note-info">
				<div className="note-info-panel note-info-stats">
					<h2 className="panel-title">Info</h2>
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
				<div className="note-info-panel note-info-pin">
					<label className="note-info-item" htmlFor="note-info-pin-checkbox">
						<span className="note-info-item-text">
							<span className="note-info-name">Pin to top</span>
						</span>
						<span className="note-info-item-control">
							<ToggleControl id="note-info-pin-checkbox" checked={systemTags.indexOf( 'pinned' ) !== -1} onChange={this.onPinChanged} />
						</span>
					</label>
				</div>
				<div className="note-info-panel note-info-markdown">
					<label className="note-info-item" htmlFor="note-info-markdown-checkbox">
						<span className="note-info-item-text">
							<span className="note-info-name">Markdown</span>
							<br /><span className="note-info-detail">
								Enable markdown formatting on this note. Learn more…
							</span>
						</span>
						<span className="note-info-item-control">
							<ToggleControl id="note-info-markdown-checkbox" checked={systemTags.indexOf( 'markdown' ) !== -1} onChange={this.onMarkdownChanged} />
						</span>
					</label>
				</div>
				<div className="note-info-panel note-info-public-link">
					<p className="note-info-item">
						<span className="note-info-item-text">
							<span className="note-info-name">Public link</span>
							<br /><span className="note-info-detail">{data && data.publishURL}</span>
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
