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

RadioGroup.propTypes = {
  groupSlug: PropTypes.string,
  slug: PropTypes.string,
  isEnabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default RadioGroup;
