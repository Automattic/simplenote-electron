import React from 'react';
import PropTypes from 'prop-types';

import CheckboxControl from '../controls/checkbox';

const RadioGroup = ({ groupSlug, slug, isEnabled, onChange }) => (
  <CheckboxControl
    type="radio"
    name={groupSlug}
    value={slug}
    id={`settings-field-${groupSlug}-${slug}`}
    checked={isEnabled}
    onChange={() => onChange(slug)}
  />
);

RadioGroup.proptypes = {
  isEnabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  groupSlug: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
};

export default RadioGroup;
