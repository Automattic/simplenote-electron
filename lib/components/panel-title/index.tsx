import { createElement, FunctionComponent } from 'react';

type OwnProps = {
  children: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
};

const PanelTitle: FunctionComponent<OwnProps> = ({
  children,
  headingLevel = 3,
}) => {
  return createElement(
    `h${headingLevel}`,
    { className: 'panel-title' },
    children
  );
};

export default PanelTitle;
