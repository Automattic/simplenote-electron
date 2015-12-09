import React, { PropTypes } from 'react';
import createHash from 'create-hash/browser';
import includes from 'lodash/collection/includes';
import TabbedDialog from '../tabbed-dialog';
import ToggleControl from '../controls/toggle';

const shareTabs = [ 'publish', 'collaborate' ];

export default React.createClass( {

	propTypes: {
		actions: PropTypes.object.isRequired,
		dialog: PropTypes.object.isRequired,
		params: PropTypes.shape( {
			note: PropTypes.object.isRequired
		} ).isRequired
	},

	onDone() {
		this.props.actions.closeDialog( { key: this.props.dialog.key } );
	},

	onTogglePublished( event ) {
		this.props.actions.publishNote( {
			noteBucket: this.props.noteBucket,
			note: this.props.params.note,
			publish: event.currentTarget.checked
		} );
	},

	copyPublishURL() {
		this.publishUrlElement.select();

		try {
			document.execCommand( 'copy' );
		} catch ( err ) {
			return;
		}

		this.copyUrlElement.focus();
	},

	onAddCollaborator( event ) {
		const { note } = this.props.params;
		const tags = note.data && note.data.tags || [];
		const collaborator = this.collaboratorElement.value.trim();

		event.preventDefault();
		this.collaboratorElement.value = '';

		if ( collaborator !== '' && tags.indexOf( collaborator ) === -1 ) {
			this.props.actions.updateNoteTags( {
				noteBucket: this.props.noteBucket,
				tagBucket: this.props.tagBucket,
				note, tags: [ ...tags, collaborator ]
			} );
		}
	},

	onRemoveCollaborator( collaborator ) {
		const { note } = this.props.params;

		let tags = note.data && note.data.tags || [];
		tags = tags.filter( tag => tag !== collaborator );

		this.props.actions.updateNoteTags( {
			noteBucket: this.props.noteBucket,
			tagBucket: this.props.tagBucket,
			note, tags
		} );
	},

	collaborators() {
		const { note } = this.props.params;
		const tags = note.data && note.data.tags || [];
		const collaborators = tags.filter( tag => tag.indexOf( '@' ) !== -1 );

		collaborators.reverse();

		return collaborators;
	},

	gravatarURL( email ) {
		const hash = createHash( 'md5' );

		hash.update( email.trim().toLowerCase() );
		let digest = hash.digest().toString( 'hex' ).toLowerCase();

		return `https://secure.gravatar.com/avatar/${digest}.jpg?s=34`;
	},

	render() {
		var { dialog } = this.props;

		return (
			<TabbedDialog className="settings"
				title="Share"
				tabs={shareTabs}
				onDone={this.onDone}
				renderTabName={this.renderTabName}
				renderTabContent={this.renderTabContent}
				{...dialog} />
		);
	},

	renderTabName( tabName ) {
		return tabName;
	},

	renderTabContent( tabName ) {
		const { note } = this.props.params;
		const data = note && note.data || {};
		const isPublished = includes( data.systemTags, 'published' );
		const publishURL = isPublished && data.publishURL !== '' && data.publishURL && `http://simp.ly/publish/${data.publishURL}` || null;

		switch ( tabName ) {
			case 'publish':
				return (
					<div className="dialog-column share-publish">
						<div className="settings-group">
							<div className="settings-items color-border">
								<label htmlFor="settings-field-public" className="settings-item color-border">
									<div className="settings-item-label">
										Make public link
									</div>
									<div className="settings-item-control">
										<ToggleControl id="settings-field-public"
											onChange={this.onTogglePublished}
											checked={isPublished} />
									</div>
								</label>
							</div>
							<p>
								Ready to share your note with the world?
								Anyone with the public link will be able to view the latest version.
							</p>
							<h3 className="panel-title">Public link</h3>
							<div className="settings-items color-border">
								<div className="settings-item color-border">
									<input ref={e => this.publishUrlElement = e} className="settings-item-text-input transparent-input" placeholder={isPublished ? 'Publishing note…' : 'Note not published'} value={publishURL} />
									<div className="settings-item-control">
										<button ref={e => this.copyUrlElement = e} type="button" className="text-button" onClick={this.copyPublishURL}>Copy</button>
									</div>
								</div>
							</div>
							{isPublished && publishURL && <p>Note published!</p>}
						</div>
					</div>
				);

			case 'collaborate':
				return (
					<div className="dialog-column share-collaborate">
						<div className="settings-group">
							<p>
								Add an email address to share a note with someone.
								You'll both be able to edit and view the note.
								You can also add the email as a tag.
							</p>
							<div className="settings-items color-border">
								<form className="settings-item color-border" onSubmit={this.onAddCollaborator}>
									<input ref={e => this.collaboratorElement = e} type="email" pattern="[^@]+@[^@]+" className="settings-item-text-input transparent-input" placeholder="email@example.com" />
									<div className="settings-item-control">
										<button type="submit" className="text-button">Add Email</button>
									</div>
								</form>
							</div>
						</div>
						<h3 className="panel-title color-border">Collaborators</h3>
						<ul className="share-collaborators">
							{this.collaborators().map( collaborator =>
								<li key={collaborator} className="share-collaborator">
									<span className="share-collaborator-photo"><img src={this.gravatarURL( collaborator )} width="34" height="34" /></span>
									<span className="share-collaborator-name">{collaborator}</span>
									<button className="share-collaborator-remove text-button" onClick={this.onRemoveCollaborator.bind( this, collaborator )}>Remove</button>
								</li>
							)}
						</ul>
					</div>
				);
		}
	}

} );
