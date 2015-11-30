import React from 'react'
import classNames from 'classnames'

export default function ToggleControl( { className, ...props } ) {
	return (
		<span className={classNames( 'toggle-control', className ) }>
			<input type="checkbox" {...props} />
			<span className="toggle-control-layers">
				<span className="toggle-control-unchecked-color"></span>
				<span className="toggle-control-checked-color"></span>
				<span className="toggle-control-knob"></span>
			</span>
		</span>
	);
}
