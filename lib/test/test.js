import 'regenerator-runtime/runtime';
import { Application } from 'spectron';
import electronPath from 'electron';
import path from 'path';

const app = new Application({
  path: electronPath,
  args: [path.join(__dirname, '..', '..')],
});

describe('E2E', () => {
  beforeEach(async () => await app.start(), 10000);

  afterEach(async () => app && app.isRunning() && (await app.stop()));

  test('starts', async () => {
    await app.client.waitUntilWindowLoaded();
    expect(app.isRunning()).toEqual(true);
  });

  test('logs in', async () => {
    await app.client.waitUntilWindowLoaded();

    const username = app.client.$('#login__field-username');
    const password = app.client.$('#login__field-password');

    if (!username.isExisting()) {
      await username.waitForExist();
    }

    if (!password.isExisting()) {
      await password.waitForExist();
    }

    username.setValue(process.env.TEST_USERNAME);
    password.setValue(process.env.TEST_PASSWORD);

    await new Promise(resolve => setTimeout(resolve, 500));

    await app.client.$('#login__login-button').click();

    await app.client.waitUntilWindowLoaded();
    await new Promise(resolve => setTimeout(resolve, 5000));
    expect(await app.client.$('.simplenote-app').isExisting()).toEqual(true);
  });
});
