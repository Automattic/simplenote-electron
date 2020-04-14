import React, { FunctionComponent } from "react";
import "./style";

const BootWarning: FunctionComponent = ({ children }) => (
  <h3 className="boot-warning__message">{children}</h3>
);

export default BootWarning;
