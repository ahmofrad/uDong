import test from 'node:test';
import assert from 'node:assert/strict';

const mockStore = {};

globalThis.localStorage = {
  getItem: (key) => mockStore[key] ?? null,
  setItem: (key, val) => { mockStore[key] = String(val); },
  removeItem: (key) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach((k) => delete mockStore[k]); },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] ?? null
};

let cookieStr = '';
globalThis.document = {
  get cookie() { return cookieStr; },
  set cookie(val) {
    const match = val.match(/^([^=]+)=([^;]+)/);
    if (!match) return;
    const [, key, value] = match;
    const parts = cookieStr.split('; ').filter((p) => !p.startsWith(`${key}=`));
    parts.push(`${key}=${value}`);
    cookieStr = parts.join('; ');
  }
};

const { loadTrip, loadTripIndex, saveTrip, saveTripIndex, deleteTrip } = await import('../js/storage/localStorageAdapter.js');
const { preferences, getCookie, setCookie } = await import('../js/storage/cookieAdapter.js');

test('localStorage: saveTrip stores trip and updates index', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  const trip = { id: 'trip_1', name: 'Test', families: [], expenses: [] };
  saveTrip(trip);
  assert.ok(mockStore['dong:trip:trip_1']);
  const index = JSON.parse(mockStore['dong:trips:index']);
  assert.equal(index.length, 1);
  assert.equal(index[0].id, 'trip_1');
});

test('localStorage: loadTripIndex returns empty array when empty', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  assert.deepEqual(loadTripIndex(), []);
});

test('localStorage: loadTrip loads saved trip', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  const trip = { id: 'trip_2', name: 'Test2', families: [], expenses: [] };
  saveTrip(trip);
  const loaded = loadTrip('trip_2');
  assert.equal(loaded.id, 'trip_2');
  assert.equal(loaded.name, 'Test2');
});

test('localStorage: loadTrip returns null for missing trip', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  assert.equal(loadTrip('nonexistent'), null);
});

test('localStorage: deleteTrip removes trip and index entry', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  const trip = { id: 'trip_3', name: 'Test3', families: [], expenses: [] };
  saveTrip(trip);
  assert.ok(mockStore['dong:trip:trip_3']);
  deleteTrip('trip_3');
  assert.equal(mockStore['dong:trip:trip_3'], undefined);
  const index = JSON.parse(mockStore['dong:trips:index']);
  assert.equal(index.length, 0);
});

test('localStorage: saveTripIndex overwrites existing entries', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  saveTripIndex([{ id: 'a', name: 'A' }]);
  assert.equal(JSON.parse(mockStore['dong:trips:index']).length, 1);
  saveTripIndex([{ id: 'b', name: 'B' }]);
  assert.equal(JSON.parse(mockStore['dong:trips:index']).length, 1);
  assert.equal(JSON.parse(mockStore['dong:trips:index'])[0].id, 'b');
});

test('localStorage: handles corrupt JSON gracefully', () => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  mockStore['dong:trips:index'] = 'not-json{';
  assert.deepEqual(loadTripIndex(), []);
  mockStore['dong:trip:bad'] = 'corrupt{';
  assert.equal(loadTrip('bad'), null);
});

test('cookie: getCookie returns fallback for missing cookie', () => {
  cookieStr = '';
  assert.equal(getCookie('dong_language', 'fa'), 'fa');
});

test('cookie: setCookie and getCookie round-trip', () => {
  cookieStr = '';
  setCookie('dong_test', 'hello');
  assert.equal(getCookie('dong_test'), 'hello');
});

test('cookie: setCookie overwrites existing value', () => {
  cookieStr = '';
  setCookie('dong_test', 'first');
  setCookie('dong_test', 'second');
  assert.equal(getCookie('dong_test'), 'second');
});

test('cookie: preferences object reads and writes', () => {
  cookieStr = '';
  preferences.language = 'en';
  assert.equal(getCookie('dong_language'), 'en');
  assert.equal(preferences.language, 'en');

  preferences.theme = 'dark';
  assert.equal(getCookie('dong_theme'), 'dark');
  assert.equal(preferences.theme, 'dark');

  preferences.digits = 'persian';
  assert.equal(getCookie('dong_digits'), 'persian');
  assert.equal(preferences.digits, 'persian');
});

test('cookie: preferences defaults', () => {
  cookieStr = '';
  assert.equal(preferences.language, 'fa');
  assert.equal(preferences.theme, 'light');
  assert.equal(preferences.digits, 'latin');
  assert.equal(preferences.activeTripId, null);
});
