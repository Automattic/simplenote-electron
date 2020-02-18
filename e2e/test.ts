import 'regenerator-runtime/runtime';
import path from 'path';
import rimraf from 'rimraf';
import { Application } from 'spectron';

const TEST_USERNAME = process.env.TEST_USERNAME as string;
const TEST_PASSWORD = process.env.TEST_PASSWORD as string;

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

  const usernameField = () => app.client.$('#login__field-username');
  const passwordField = () => app.client.$('#login__field-password');
  const loginButton = () => app.client.$('#login__login-button');

  const enterLoginInfo = async (
    username: string,
    password: string,
    maxWait = 500
  ) => {
    await app.client.waitUntilWindowLoaded();

    expect(usernameField().waitForExist(maxWait)).toBeTruthy();
    usernameField().setValue(username);
    expect(passwordField().waitForExist(maxWait)).toBeTruthy();
    passwordField().setValue(password);
  };

  test('login with wrong password fails', async () => {
    await app.client.waitUntilWindowLoaded();
    await enterLoginInfo(TEST_USERNAME, `${TEST_PASSWORD}_wrong`);
    await wait(500);
    expect(loginButton().waitForExist(500)).toBeTruthy();
    loginButton().click();

    expect(
      app.client.$('[data-error-name="invalid-credentials"]').waitForExist(5000)
    ).toBeTruthy();
  }, 6000);

  test('login with correct password logs in', async () => {
    await app.client.waitUntilWindowLoaded();
    await enterLoginInfo(TEST_USERNAME, TEST_PASSWORD);
    await wait(2000); // DDoS guard
    expect(loginButton().waitForExist(500)).toBeTruthy();
    loginButton().click();

    await app.client.waitUntilWindowLoaded();
    expect(app.client.$('.note-list').waitForExist(10000)).toBeTruthy();
  }, 20000);

  test('can create new note by clicking on new note button', async () => {
    await app.client.waitUntilWindowLoaded();
    await enterLoginInfo(TEST_USERNAME, TEST_PASSWORD);
    await wait(2000); // DDoS guard
    expect(loginButton().waitForExist(500)).toBeTruthy();
    loginButton().click();

    await app.client.waitUntilWindowLoaded();
    const newNoteButton = app.client.$('button[data-title="New Note"]');
    expect(newNoteButton.waitForExist(10000)).toBeTruthy();
    newNoteButton.click();

    expect(
      app.client
        .$('.public-DraftEditor-content.focus-visible')
        .waitForExist(2000)
    ).toBeTruthy();
  }, 20000);
});
