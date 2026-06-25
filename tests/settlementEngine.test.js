import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExpenseTotal, calculateSettlement, simplifyDebts } from '../js/utils/settlementEngine.js';

function trip(expenses, families = defaultFamilies()) {
  return {
    id: 'trip_1',
    name: 'Test',
    dateCalendar: 'jalali',
    currency: 'toman',
    families,
    expenses
  };
}

function defaultFamilies() {
  return [
    { id: 'fam_a', name: 'A', colorHex: '#000', members: [{ id: 'a1', familyId: 'fam_a', name: 'A1' }] },
    { id: 'fam_b', name: 'B', colorHex: '#111', members: [{ id: 'b1', familyId: 'fam_b', name: 'B1' }] }
  ];
}

test('splits a simple expense and settles family to family', () => {
  const result = calculateSettlement(trip([
    expense({
      participants: ['a1', 'b1'],
      charges: [{ amount: 1000, payerMemberId: 'a1' }]
    })
  ]));

  assert.deepEqual(result.memberBalance, { a1: 500, b1: -500 });
  assert.deepEqual(result.familyBalance, { fam_a: 500, fam_b: -500 });
  assert.deepEqual(result.transfers, [{ from: 'fam_b', to: 'fam_a', amount: 500 }]);
});

test('supports percent tax by debiting shares without payer credit', () => {
  const item = expense({
    participants: ['a1', 'b1'],
    charges: [{ amount: 1000, payerMemberId: 'a1' }],
    tax: { type: 'percent', value: 10 }
  });
  assert.deepEqual(calculateExpenseTotal(item), {
    chargesTotal: 1000,
    taxAmount: 100,
    expenseTotal: 1100
  });

  const result = calculateSettlement(trip([item]));
  assert.equal(result.memberBalance.a1, 450);
  assert.equal(result.memberBalance.b1, -550);
  assert.deepEqual(result.transfers, [{ from: 'fam_b', to: 'fam_a', amount: 450 }]);
});

test('supports fixed tax', () => {
  const result = calculateSettlement(trip([
    expense({
      participants: ['a1', 'b1'],
      charges: [{ amount: 1000, payerMemberId: 'a1' }],
      tax: { type: 'fixed', value: 200 }
    })
  ]));

  assert.equal(result.memberBalance.a1, 400);
  assert.equal(result.memberBalance.b1, -600);
});

test('payer does not need to be a participant', () => {
  const result = calculateSettlement(trip([
    expense({
      participants: ['b1'],
      charges: [{ amount: 900, payerMemberId: 'a1' }]
    })
  ]));

  assert.deepEqual(result.memberBalance, { a1: 900, b1: -900 });
});

test('single-family trip produces no transfers', () => {
  const families = [
    {
      id: 'fam_a',
      name: 'A',
      colorHex: '#000',
      members: [
        { id: 'a1', familyId: 'fam_a', name: 'A1' },
        { id: 'a2', familyId: 'fam_a', name: 'A2' }
      ]
    }
  ];
  const result = calculateSettlement(trip([
    expense({
      participants: ['a1', 'a2'],
      charges: [{ amount: 1000, payerMemberId: 'a1' }]
    })
  ], families));

  assert.deepEqual(result.transfers, []);
});

test('rounding pushes remainder to the first share', () => {
  const families = [
    { id: 'fam_a', name: 'A', colorHex: '#000', members: [{ id: 'a1', familyId: 'fam_a', name: 'A1' }] },
    { id: 'fam_b', name: 'B', colorHex: '#111', members: [{ id: 'b1', familyId: 'fam_b', name: 'B1' }] },
    { id: 'fam_c', name: 'C', colorHex: '#222', members: [{ id: 'c1', familyId: 'fam_c', name: 'C1' }] }
  ];
  const result = calculateSettlement(trip([
    expense({
      participants: ['a1', 'b1', 'c1'],
      charges: [{ amount: 1000, payerMemberId: 'a1' }]
    })
  ], families));

  assert.deepEqual(result.memberBalance, { a1: 666, b1: -333, c1: -333 });
});

test('greedy simplification reduces transfers', () => {
  assert.deepEqual(simplifyDebts({
    fam_a: 1000,
    fam_b: 500,
    fam_c: -700,
    fam_d: -800
  }), [
    { from: 'fam_d', to: 'fam_a', amount: 800 },
    { from: 'fam_c', to: 'fam_a', amount: 200 },
    { from: 'fam_c', to: 'fam_b', amount: 500 }
  ]);
});

function expense({ participants, charges, tax = null }) {
  return {
    id: `exp_${Math.random()}`,
    title: 'Expense',
    icon: 'food',
    date: null,
    participantMemberIds: participants,
    tax,
    charges: charges.map((charge, index) => ({
      id: `chg_${index}`,
      note: '',
      createdAt: '',
      ...charge
    })),
    notes: '',
    createdAt: ''
  };
}
