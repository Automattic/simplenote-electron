import React from 'react';
import PropTypes from 'prop-types';

const Heading = ({ headingLevel, children }) => {
  const elementType = `h${headingLevel}`;
  const elementClass = `heading heading__${headingLevel}`;

  return React.createElement(
    elementType,
    { className: elementClass },
    children
  );
};

Heading.propTypes = {
  headingLevel: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};

export default Heading;
