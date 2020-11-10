import React from 'react';

type OwnProps = {
  onClick: (event: React.MouseEvent<SVGSVGElement>) => any;
};

type Props = OwnProps;

export default function CrossOutlineIcon({ onClick }: Props) {
  return (
    <svg
      className="icon-cross-outline"
      onClick={onClick}
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
    >
      <path d="M15.95 6.05c2.73 2.73 2.73 7.17 0 9.9s-7.17 2.728-9.9 0-2.728-7.17 0-9.9 7.17-2.73 9.9 0M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm4.243 11.828L12.413 11l2.83-2.828-1.415-1.414L11 9.586l-2.828-2.83-1.415 1.416L9.587 11l-2.83 2.828 1.415 1.414L11 12.414l2.828 2.828 1.415-1.414z" />
    </svg>
  );
}
