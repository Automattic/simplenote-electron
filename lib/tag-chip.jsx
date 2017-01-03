import React from 'react';
import classNames from 'classnames';
import { noop } from 'lodash';

export const TagChip = ( { onSelect = noop, selected, tag: tagName } ) => (
	<div
		className={ classNames( 'tag-chip', { selected } ) }
		data-tag-name={ tagName }
		onClick={ onSelect }
	>
		{ tagName }
	</div>
);

export default TagChip;
