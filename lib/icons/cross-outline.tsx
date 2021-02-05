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
      viewBox="0 0 24 24"
    >
      <rect x="0" fill="none" width="24" height="24" />
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10S17.523 22 12 22zM12 4c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8S16.418 4 12 4zM16.24 9.17l-1.41-1.41L12 10.59 9.17 7.76 7.76 9.17 10.59 12l-2.83 2.83 1.41 1.41L12 13.41l2.83 2.83 1.41-1.41L13.41 12 16.24 9.17z" />
    </svg>
  );
}
