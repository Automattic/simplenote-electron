import React from 'react';
import PropTypes from 'prop-types';

import ProgressBar from '../../../../components/progress-bar';

class ImportProgressBar extends React.Component {
  static propTypes = {
    currentValue: PropTypes.number.isRequired,
    endValue: PropTypes.number,
    isDone: PropTypes.bool.isRequired,
  };

  shouldComponentUpdate(nextProps) {
    if (!this.props.endValue && this.props.isDone === nextProps.isDone) {
      return false;
    }
    return true;
  }

  render() {
    const { currentValue, endValue, isDone } = this.props;

    const IndeterminateProgressBar = () => {
      return isDone ? (
        <ProgressBar variant="determinate" value={100} />
      ) : (
        <ProgressBar />
      );
    };

    if (endValue) {
      return (
        <ProgressBar
          variant="determinate"
          value={currentValue / endValue * 100}
        />
      );
    } else {
      return <IndeterminateProgressBar />;
    }
  }
}

export default ImportProgressBar;
