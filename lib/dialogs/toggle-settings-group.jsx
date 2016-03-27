import React from 'react';

import ToggleControl from '../controls/toggle';

const ToggleGroup = ( { groupSlug, slug, isEnabled, onChange } ) => (
	<ToggleControl
		name={ groupSlug }
		value={ slug }
		id={ `settings-field-${ groupSlug }-${ slug }` }
		checked={ isEnabled }
		onChange={ onChange }
	/>
);

export default ToggleGroup;
