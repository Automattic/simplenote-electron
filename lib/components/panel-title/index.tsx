import { createElement } from 'react';
import { range } from 'lodash';
import PropTypes from 'prop-types';

const PanelTitle = props => {
  const { children, headingLevel = 3 } = props;

  return createElement(
    `h${headingLevel}`,
    { className: 'panel-title theme-color-fg-dim' },
    children
  );
};

PanelTitle.proptypes = {
  children: PropTypes.string.isRequired,
  headingLevel: PropTypes.oneOf(range(1, 6)),
};

export default PanelTitle;
