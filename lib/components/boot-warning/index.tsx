import React, { FunctionComponent, PropsWithChildren } from 'react';
import './style';

const BootWarning: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <h3 className="boot-warning__message">{children}</h3>
);

export default BootWarning;
