import React from 'react'
import classNames from 'classnames'

export default function ToggleControl( { id, className, checked, onChange, inputProps, ...props } ) {
	return (
		<span className={classNames( 'toggle-control', className ) } {...props}>
			<input id={id} type="checkbox" checked={checked} onChange={onChange} {...inputProps} />
			<span className="toggle-control-layers">
				<span className="toggle-control-unchecked-color"></span>
				<span className="toggle-control-checked-color"></span>
				<span className="toggle-control-knob"></span>
			</span>
		</span>
	);
}
