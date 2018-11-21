import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Dialog from './dialog';

export class TabbedDialog extends Component {
  static propTypes = {
    className: PropTypes.string,
    tabs: PropTypes.array.isRequired,
    renderTabName: PropTypes.func.isRequired,
    renderTabContent: PropTypes.func.isRequired,
  };

  componentWillMount() {
    this.setState({
      currentTab: this.props.tabs[0],
    });
  }

  setCurrentTab = ({ target: { dataset: { tabName } } }) =>
    this.setState({ currentTab: tabName });

  render() {
    const {
      className,
      tabs,
      renderTabName,
      renderTabContent,
      ...dialog
    } = this.props;
    const { currentTab } = this.state;

    return (
      <Dialog className={className} {...dialog}>
        <nav className="dialog-tabs theme-color-border">
          <ul>
            {tabs.map((tab, key) => (
              <li key={key}>
                <button
                  type="button"
                  className={classNames('button button-borderless', {
                    'dialog-tab-active': tab === currentTab,
                  })}
                  data-tab-name={tab}
                  onClick={this.setCurrentTab}
                >
                  {renderTabName(tab)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="dialog-tab-content">
          {renderTabContent(this.state.currentTab)}
        </div>
      </Dialog>
    );
  }
}

export default TabbedDialog;
