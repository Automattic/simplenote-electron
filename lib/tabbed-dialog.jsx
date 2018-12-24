import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import Dialog from './dialog';

export class TabbedDialog extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    tabNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  };

  render() {
    const { children, className, tabNames, ...props } = this.props;

    return (
      <Dialog className={className} {...props}>
        <Tabs selectedTabClassName="dialog-tab-active">
          <TabList className="dialog-tabs theme-color-border">
            {tabNames.map((tabName, key) => (
              <Tab className="button button-borderless" key={key}>
                {tabName}
              </Tab>
            ))}
          </TabList>

          <div className="dialog-tab-content">
            {children.map((tabPanel, key) => (
              <TabPanel key={key}>{tabPanel}</TabPanel>
            ))}
          </div>
        </Tabs>
      </Dialog>
    );
  }
}

export default TabbedDialog;
