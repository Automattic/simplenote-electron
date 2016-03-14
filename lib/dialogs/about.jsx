import React, { PropTypes } from 'react';
import SimplenoteLogo from '../icons/simplenote';
import CrossIcon from '../icons/cross';
import TopRightArrowIcon from '../icons/arrow-top-right';
import Dialog from '../dialog';

export default React.createClass( {

	propTypes: {
		actions: PropTypes.object.isRequired,
		dialog: PropTypes.object.isRequired
	},

	onDone() {
		this.props.actions.closeDialog( { key: this.props.dialog.key } );
	},

	render() {
		var dialog = this.props.dialog;

		return (
			<Dialog className="about" {...dialog} onDone={ this.onDone }>
				<div className="about-top">
					<SimplenoteLogo />

					<h1>Simplenote</h1>
					<small>Version {config.version}</small>
				</div>

				<ul className="about-links">
					<li>
						<a target="_blank" href="http://simplenote.com/blog/">
							<span className="about-links-title">Blog</span>
							<br />simplenote.com/blog/
						</a>
						<TopRightArrowIcon />
					</li>
					<li>
						<a target="_blank" href="https://twitter.com/simplenoteapp">
							<span className="about-links-title">Twitter</span>
							<br />@simplenoteapp
						</a>
						<TopRightArrowIcon />
					</li>
					<li>
						<a target="_blank" href="http://simplenote.com/">
							<span className="about-links-title">Apps</span>
							<br />simplenote.com
						</a>
						<TopRightArrowIcon />
					</li>
					<li>
						<a target="_blank" href="https://github.com/Automattic/simplenote-electron">
							<span className="about-links-title">Contribute</span>
							<br />GitHub.com
						</a>
						<TopRightArrowIcon />
					</li>
					<li>
						<a target="_blank" href="https://automattic.com/work-with-us/">
							Made with love by the folks at Automattic.
							<br />Are you a developer? We&rsquo;re hiring.
						</a>
						<TopRightArrowIcon />
					</li>
				</ul>

				<div className="about-bottom">
					<p>
						<a target="_blank" href="http://simplenote.com/privacy/">Privacy Policy</a>
						{' '}&nbsp;&bull;&nbsp;{' '}
						<a target="_blank" href="http://simplenote.com/terms/">Terms of Service</a>
					</p>
					<p>
						<a target="_blank" href="https://automattic.com/">&copy; 2016 Automattic, Inc.</a>
					</p>
				</div>

				<button type="button" className="about-done button button-borderless" onClick={this.onDone}>
					<CrossIcon />
				</button>
			</Dialog>
		);
	}

} );
