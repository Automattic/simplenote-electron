import React from 'react';

export const Item = () => null;

export const SettingsGroup = ( { title: groupTitle, slug: groupSlug, activeSlug, onChange, renderer, children } ) => (
	<div className="settings-group">
		<h3 className="panel-title theme-color-fg-dim">{ groupTitle }</h3>
		<div className="settings-items theme-color-border">
			{ React.Children.map( children, ( { props: { slug, title } } ) => (
				<label
					className="settings-item theme-color-border"
					htmlFor={ `settings-field-${ groupSlug }-${ slug }` }
					key={ slug }
				>
					<div className="settings-item-label">{ title }</div>
					<div className="settings-item-control">
						{ renderer( {
							activeSlug,
							groupTitle,
							groupSlug,
							slug,
							title,
							isEnabled: slug === activeSlug,
							onChange
						} ) }
					</div>
				</label>
			) ) }
		</div>
	</div>
);

export default SettingsGroup;
