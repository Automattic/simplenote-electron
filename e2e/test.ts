import 'regenerator-runtime/runtime';
import path from 'path';
import rimraf from 'rimraf';
import { Application } from 'spectron';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const app: Application = new Application({
  path: path.join(__dirname, '../node_modules/.bin/electron'),
  args: [path.join(__dirname, '..')],
});

beforeAll(async () => {
  await app.start();
  const userData = await app.electron.remote.app.getPath('userData');
  await app.stop();
  await new Promise(resolve => rimraf(userData, () => resolve()));
  await app.start();
}, 10000);

afterAll(async () => app && app.isRunning() && (await app.stop()));

describe('E2E', () => {
  test('starts', async () => {
    await app.client.waitUntilWindowLoaded();
    expect(app.isRunning()).toEqual(true);
  });

  test('logs in', async () => {
    await app.client.waitUntilWindowLoaded();

    app.client
      .$('#login__field-username')
      .setValue(process.env.TEST_USERNAME as string);
    app.client
      .$('#login__field-password')
      .setValue(process.env.TEST_PASSWORD as string);

    await wait(500);

    app.client.$('#login__login-button').click();

    await app.client.waitUntilWindowLoaded();
    await app.client.waitForExist('.note-list', 10000);
  }, 20000);
});
