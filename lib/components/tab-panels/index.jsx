import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

export class TabPanels extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    tabNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  };

  render() {
    const { children, tabNames } = this.props;

    return (
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
            <TabPanel key={key}>
              <div className="dialog-column">{tabPanel}</div>
            </TabPanel>
          ))}
        </div>
      </Tabs>
    );
  }
}

export default TabPanels;
