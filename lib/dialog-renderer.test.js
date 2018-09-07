import { shallow } from 'enzyme';

import DialogRenderer from './dialog-renderer';

describe('DialogRenderer', () => {
  const props = {
    appProps: {
      actions: {},
      appState: {},
      noteBucket: {},
      tagBucket: {},
    },
    dialogs: [
      {
        type: 'Share',
        modal: true,
      },
    ],
    isElectron: true,
  };

  it('should render', () => {
    const component = shallow(DialogRenderer(props));
    expect(component.exists()).toBe(true);
  });
});
