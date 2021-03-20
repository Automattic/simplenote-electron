import React from 'react';

const DevBadge = (props: React.HTMLProps<HTMLDivElement>) => {
  return (
    <div className="dev-badge" {...props}>
      DEV
    </div>
  );
};

export default DevBadge;
