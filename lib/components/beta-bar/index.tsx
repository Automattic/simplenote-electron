import React, { useState } from 'react';
import SmallCrossIcon from '../../icons/cross-small';
import { isElectron } from '../../utils/platform';

const loadOptOut = (): boolean => {
  try {
    const stored = localStorage.getItem('betaBannerDismissedAt');
    const dismissedAt = stored ? parseInt(stored, 10) : -Infinity;

    return (
      isNaN(dismissedAt) || Date.now() - dismissedAt > 7 * 24 * 60 * 60 * 1000
    );
  } catch (e) {
    return true;
  }
};

const storeOptOut = () => {
  try {
    localStorage.setItem('betaBannerDismissedAt', Date.now().toString());
  } catch (e) {
    // pass
  }
};

const BetaBar = () => {
  const [isVisible, setIsVisible] = useState(loadOptOut());
  const dismissBanner = () => {
    storeOptOut();
    setIsVisible(false);
  };

  return !isElectron && isVisible ? (
    <div className="beta-bar">
      You&lsquo;re invited to try Simplenote Beta.
      <a href="https://staging.simplenote.com">Try it now.</a>
      <a className="icon" onClick={dismissBanner}>
        <SmallCrossIcon />
      </a>
    </div>
  ) : null;
};

export default BetaBar;
