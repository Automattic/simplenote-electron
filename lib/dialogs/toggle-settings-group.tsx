import React, { FunctionComponent } from 'react';

import ToggleControl from '../controls/toggle';

type OwnProps = {
  groupSlug: string;
  slug: string;
  isEnabled: boolean;
  onChange: () => any;
};

type Props = OwnProps;

const ToggleGroup: FunctionComponent<Props> = ({
  groupSlug,
  slug,
  isEnabled,
  onChange,
}) => (
  <ToggleControl
    name={groupSlug}
    value={slug}
    id={`settings-field-${groupSlug}-${slug}`}
    checked={isEnabled}
    onChange={onChange}
  />
);

export default ToggleGroup;
