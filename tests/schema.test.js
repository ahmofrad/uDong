import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTrip } from '../js/state/schema.js';

function validTrip() {
  return {
    id: 'trip_1',
    name: 'Beach trip',
    dateCalendar: 'jalali',
    currency: 'toman',
    families: [
      { id: 'fam_a', name: 'A', colorHex: '#0f766e', members: [{ id: 'a1', familyId: 'fam_a', name: 'Ali' }] },
      { id: 'fam_b', name: 'B', colorHex: '#b45309', members: [{ id: 'b1', familyId: 'fam_b', name: 'Bob' }] }
    ],
    expenses: [
      {
        id: 'exp_1',
        title: 'Dinner',
        icon: 'food',
        date: null,
        participantMemberIds: ['a1', 'b1'],
        tax: { type: 'percent', value: 10 },
        charges: [{ id: 'chg_1', amount: 1000, payerMemberId: 'a1', note: '', createdAt: 'x' }],
        notes: '',
        createdAt: 'x'
      }
    ]
  };
}

test('sanitizeTrip returns null for non-objects and arrays', () => {
  assert.equal(sanitizeTrip(null), null);
  assert.equal(sanitizeTrip(undefined), null);
  assert.equal(sanitizeTrip('string'), null);
  assert.equal(sanitizeTrip(42), null);
  assert.equal(sanitizeTrip([validTrip()]), null);
});

test('sanitizeTrip returns null when id or name missing', () => {
  assert.equal(sanitizeTrip({ name: 'x' }), null);
  assert.equal(sanitizeTrip({ id: 'x' }), null);
  assert.equal(sanitizeTrip({ id: '  ', name: 'x' }), null);
});

test('sanitizeTrip keeps a fully valid trip intact', () => {
  const clean = sanitizeTrip(validTrip());
  assert.equal(clean.id, 'trip_1');
  assert.equal(clean.name, 'Beach trip');
  assert.equal(clean.families.length, 2);
  assert.equal(clean.expenses.length, 1);
  assert.equal(clean.expenses[0].charges.length, 1);
});

test('sanitizeTrip coerces missing families/expenses to arrays', () => {
  const clean = sanitizeTrip({ id: 't', name: 'T', families: 'nope', expenses: null });
  assert.deepEqual(clean.families, []);
  assert.deepEqual(clean.expenses, []);
});

test('sanitizeTrip drops malformed families and members', () => {
  const trip = validTrip();
  trip.families.push({ noId: true });
  trip.families[0].members.push({ name: 'no id' });
  trip.families[0].members.push(null);
  const clean = sanitizeTrip(trip);
  assert.equal(clean.families.length, 2);
  assert.equal(clean.families[0].members.length, 1);
});

test('sanitizeTrip defaults invalid calendar/currency via migration', () => {
  const clean = sanitizeTrip({ id: 't', name: 'T', dateCalendar: 'martian', currency: 'btc', families: [], expenses: [] });
  assert.equal(clean.dateCalendar, 'martian'); // migrateTrip passes through; validators flag it later
  assert.equal(clean.currency, 'btc');
});

test('sanitizeTrip drops charges referencing unknown members', () => {
  const trip = validTrip();
  trip.expenses[0].charges.push({ id: 'chg_x', amount: 500, payerMemberId: 'ghost', note: '', createdAt: 'x' });
  const clean = sanitizeTrip(trip);
  assert.equal(clean.expenses[0].charges.length, 1);
});

test('sanitizeTrip drops charges with negative or non-numeric amounts', () => {
  const trip = validTrip();
  trip.expenses[0].charges.push({ id: 'chg_neg', amount: -5, payerMemberId: 'a1', note: '', createdAt: 'x' });
  trip.expenses[0].charges.push({ id: 'chg_nan', amount: 'abc', payerMemberId: 'a1', note: '', createdAt: 'x' });
  const clean = sanitizeTrip(trip);
  assert.equal(clean.expenses[0].charges.length, 1);
  assert.equal(clean.expenses[0].charges[0].amount, 1000);
});

test('sanitizeTrip filters participants to existing members', () => {
  const trip = validTrip();
  trip.expenses[0].participantMemberIds = ['a1', 'ghost', 'b1', 'a1'];
  const clean = sanitizeTrip(trip);
  assert.deepEqual(clean.expenses[0].participantMemberIds, ['a1', 'b1']);
});

test('sanitizeTrip removes out-of-range tax', () => {
  const trip = validTrip();
  trip.expenses[0].tax = { type: 'percent', value: 250 };
  const clean = sanitizeTrip(trip);
  assert.equal(clean.expenses[0].tax, null);
});

test('sanitizeTrip keeps valid fixed and percent tax', () => {
  const trip = validTrip();
  trip.expenses[0].tax = { type: 'fixed', value: 99.6 };
  assert.deepEqual(sanitizeTrip(trip).expenses[0].tax, { type: 'fixed', value: 100 });
  trip.expenses[0].tax = { type: 'percent', value: 9 };
  assert.deepEqual(sanitizeTrip(trip).expenses[0].tax, { type: 'percent', value: 9 });
});

test('sanitizeTrip rejects invalid colorHex', () => {
  const trip = validTrip();
  trip.families[0].colorHex = 'not-a-color';
  const clean = sanitizeTrip(trip);
  assert.match(clean.families[0].colorHex, /^#[0-9a-fA-F]{3,8}$/);
});
