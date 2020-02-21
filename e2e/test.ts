import 'regenerator-runtime/runtime';
import path from 'path';
import rimraf from 'rimraf';
import randomString from '../lib/utils/crypto-random-string';
import { Application } from 'spectron';

const TEST_USERNAME = `sptest-${randomString(16)}@test.localhost.localdomain`;
const TEST_PASSWORD = randomString(22);
console.info(
  `Creating user:\n       email: ${TEST_USERNAME}\n    password: ${TEST_PASSWORD}`
);

const el = (app: Application, selector: string) => app.client.$(selector);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (app: Application, selector: string, msTimeout = 10000) =>
  expect(await app.client.waitForExist(selector, msTimeout)).toBe(true);

const app: Application = new Application({
  path: path.join(__dirname, '../node_modules/.bin/electron'),
  args: [path.join(__dirname, '..')],
});

let userData = '';

beforeAll(async () => {
  await app.start();
  userData = await app.electron.remote.app.getPath('userData');
  await app.stop();
}, 10000);

describe('E2E', () => {
  beforeEach(async () => {
    await new Promise(resolve => rimraf(userData, () => resolve()));
    await app.start();
    await app.client.waitUntilWindowLoaded();
  }, 10000);

  afterEach(async () => app && app.isRunning() && (await app.stop()));

  test('starts', async () => {
    expect(app.isRunning()).toEqual(true);
  });

  const usernameField = '#login__field-username';
  const passwordField = '#login__field-password';
  const loginButton = '#login__login-button';

  const loginWith = async (username: string, password: string) => {
    await waitFor(app, usernameField);
    el(app, usernameField).setValue(username);
    await waitFor(app, passwordField);
    el(app, passwordField).setValue(password);

    await wait(2000); // try and prevent DDoS protection
    await waitFor(app, loginButton);
    el(app, loginButton).click();
  };

  test('creates an account', async () => {
    await waitFor(app, '=Sign up');
    el(app, '=Sign up').click();

    await waitFor(app, usernameField);
    await loginWith(TEST_USERNAME, TEST_PASSWORD);

    await waitFor(app, '.note-list');
    await wait(5000);
  }, 20000);

  test('login with wrong password fails', async () => {
    await loginWith(TEST_USERNAME, `${TEST_PASSWORD}_wrong`);

    await waitFor(app, '[data-error-name="invalid-login"]');
  }, 20000);

  test('login with correct password logs in', async () => {
    await loginWith(TEST_USERNAME, TEST_PASSWORD);

    await waitFor(app, '.note-list');
  }, 20000);

  test('can create new note by clicking on new note button', async () => {
    await loginWith(TEST_USERNAME, TEST_PASSWORD);
    await wait(5000); // wait for notes to load

    const newNoteButton = 'button[data-title="New Note"]';
    await waitFor(app, newNoteButton);
    el(app, newNoteButton).click();

    await waitFor(app, '.public-DraftEditor-content.focus-visible');
  }, 20000);
});
