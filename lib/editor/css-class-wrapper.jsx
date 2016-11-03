import React, { PropTypes } from 'react';

export const CssClassWrapper = ( { children, className } ) =>
	<span { ...{ className } }>{ children }</span>;

CssClassWrapper.propTypes = {
	className: PropTypes.string.isRequired,
};

export default CssClassWrapper;
