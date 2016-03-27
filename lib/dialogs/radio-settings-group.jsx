import React from 'react';

import CheckboxControl from '../controls/checkbox';

const RadioGroup = ( { groupSlug, slug, isEnabled, onChange } ) => (
	<CheckboxControl
		type="radio"
		name={ groupSlug }
		value={ slug }
		id={ `settings-field-${ groupSlug }-${ slug }` }
		checked={ isEnabled }
		onChange={ () => onChange( slug ) }
	/>
);

export default RadioGroup;
