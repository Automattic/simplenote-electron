import React, { useState } from 'react';
import SmallCrossIcon from '../../icons/cross-small';

const BetaBar = () => {
  const [isVisible, setIsVisible] = useState(true);
  return isVisible ? (
    <div className="beta-bar">
      You&lsquo;re invited to try Simplenote Beta.
      <a href="https://staging.simplenote.com">Try it now.</a>
      <a className="icon" onClick={() => setIsVisible(false)}>
        <SmallCrossIcon />
      </a>
    </div>
  ) : null;
};

export default BetaBar;
