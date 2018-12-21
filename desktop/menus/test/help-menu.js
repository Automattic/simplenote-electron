import helpMenu from '../help-menu';
import '../menu-items';

jest.mock('../menu-items', () => ({
  checkForUpdates: 'checkForUpdates',
}));

jest.mock('../../detect/platform', () => ({
  isLinux: jest.fn().mockReturnValue(false),
  isOSX: jest.fn().mockReturnValue(false),
  isWindows: jest.fn().mockReturnValue(true),
}));

jest.mock('../../detect/build', () => ({
  isWindowsStore: jest.fn().mockReturnValue(true),
}));

describe('Help Menu', () => {
  it('should not show Check for Updates menu item if Windows Store app', () => {
    expect(helpMenu.submenu).not.toEqual(
      expect.arrayContaining(['checkForUpdates'])
    );
  });
});
