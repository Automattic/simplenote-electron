import React from 'react'
import classNames from 'classnames'

export default function CheckboxControl( { className, ...props } ) {
	return (
		<span className={classNames( 'checkbox-control', className ) }>
			<input type="checkbox" {...props} />
			<span className="checkbox-control-base">
				<span className="checkbox-control-checked"></span>
			</span>
		</span>
	);
}
