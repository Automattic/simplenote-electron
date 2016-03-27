import React from 'react';

export const SettingsGroup = ( { groupTitle, groupSlug, items, activeItem, onChange, renderer } ) => (
	<div className="settings-group">
		<h3 className="panel-title theme-color-fg-dim">{ groupTitle }</h3>
		<div className="settings-items theme-color-border">
			{ items.map( ( [ slug, title ], key ) => (
				<label
					className="settings-item theme-color-border"
					htmlFor={ `settings-field-${ groupSlug }-${ slug }` }
					key={ key }
				>
					<div className="settings-item-label">{ title }</div>
					<div className="settings-item-control">
						{ renderer( {
							groupSlug,
							slug,
							isEnabled: ( activeItem === slug ),
							onChange
						} ) }
					</div>
				</label>
			) ) }
		</div>
	</div>
);

export default SettingsGroup;
