import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

type OwnProps = {
  tabNames: string[];
};

export class TabPanels extends Component<OwnProps> {
  static propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    tabNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  };

  render() {
    const { children, tabNames } = this.props;

    return (
      <Tabs selectedTabClassName="is-active">
        <TabList className="tab-panels__tab-list theme-color-border">
          {tabNames.map((tabName, key) => (
            <Tab className="button button-borderless" key={key}>
              {tabName}
            </Tab>
          ))}
        </TabList>

        <div className="tab-panels__panel">
          {React.Children.map(children, (tabPanel, key) => (
            <TabPanel key={key}>
              <div className="tab-panels__column">{tabPanel}</div>
            </TabPanel>
          ))}
        </div>
      </Tabs>
    );
  }
}

export default TabPanels;
