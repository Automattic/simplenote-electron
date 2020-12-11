import React, { FunctionComponent } from 'react';

import ImportProgressBar from './bar';
import ImportProgressText from './text';

type OwnProps = {
  currentValue?: number;
  endValue?: number;
  isDone: boolean;
};

const ImportProgress: FunctionComponent<OwnProps> = ({
  currentValue = 0,
  endValue = 0,
  isDone,
}) => {
  return (
    <section>
      <ImportProgressBar
        currentValue={currentValue}
        endValue={isDone ? currentValue : endValue}
        isDone={isDone}
      />
      <ImportProgressText currentValue={currentValue} isDone={isDone} />
    </section>
  );
};

export default ImportProgress;
