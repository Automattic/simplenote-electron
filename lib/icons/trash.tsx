import React from 'react';

type OwnProps = {
  onClick: (event: React.MouseEvent<SVGSVGElement>) => any;
};

type Props = OwnProps;

export default function TrashIcon({ onClick }: Props) {
  return (
    <svg
      className="icon-trash"
      onClick={onClick}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <rect x="0" fill="none" width="24" height="24" />
      <path d="M18 21H6c-1.105 0-2-0.895-2-2V9h2v10h12V9h2v10C20 20.105 19.105 21 18 21zM9 9h2v8H9V9zM13 9h2v8h-2V9zM16 5V4c0-1.105-0.895-2-2-2h-4C8.895 2 8 2.895 8 4v1H3v2h18V5H16zM10 4h4v1h-4V4z" />
    </svg>
  );
}
