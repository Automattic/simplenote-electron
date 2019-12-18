import React from 'react';
import PropTypes from 'prop-types';

import ToggleControl from '../controls/toggle';

const ToggleGroup = ({ groupSlug, slug, isEnabled, onChange }) => (
  <ToggleControl
    name={groupSlug}
    value={slug}
    id={`settings-field-${groupSlug}-${slug}`}
    checked={isEnabled}
    onChange={onChange}
  />
);

ToggleGroup.propTypes = {
  groupSlug: PropTypes.string,
  slug: PropTypes.string,
  isEnabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ToggleGroup;
