import React, { FunctionComponent, Fragment } from 'react';

import ToggleControl from '../controls/toggle';

type OwnProps = {
  groupSlug: string;
  slug: string;
  isEnabled: boolean | null;
  onChange: () => any;
};

type Props = OwnProps;

const ToggleGroup: FunctionComponent<Props> = ({
  groupSlug,
  slug,
  isEnabled,
  onChange,
}) => (
  <Fragment>
    {isEnabled === null ? (
      <span>Loading</span>
    ) : (
      <ToggleControl
        name={groupSlug}
        value={slug}
        id={`settings-field-${groupSlug}-${slug}`}
        checked={isEnabled}
        onChange={onChange}
      />
    )}
  </Fragment>
);

export default ToggleGroup;
