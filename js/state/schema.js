export const SCHEMA_VERSION = 1;

export const FAMILY_COLORS = [
  '#0f766e',
  '#b45309',
  '#4338ca',
  '#be123c',
  '#047857',
  '#7c3aed',
  '#0369a1',
  '#c2410c',
  '#4d7c0f',
  '#a21caf'
];

const nowIso = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

export function createTrip({
  name,
  dateCalendar = 'jalali',
  currency = 'toman',
  tripDate = null
}) {
  return {
    id: id('trip'),
    name: name.trim(),
    createdAt: nowIso(),
    schemaVersion: SCHEMA_VERSION,
    dateCalendar,
    currency,
    tripDate: tripDate || null,
    archived: false,
    families: [],
    expenses: [],
    settledTransfers: []
  };
}

export function createFamily({ name, colorHex }) {
  return {
    id: id('fam'),
    name: name.trim(),
    colorHex,
    members: []
  };
}

export function createMember({ familyId, name }) {
  return {
    id: id('mem'),
    familyId,
    name: name.trim()
  };
}

export function createExpense({
  title,
  icon = 'food',
  date = null,
  participantMemberIds = [],
  tax = null,
  charges = [],
  notes = '',
  shareWeights = null
}) {
  return {
    id: id('exp'),
    title: title.trim(),
    icon,
    date: date || null,
    participantMemberIds: [...new Set(participantMemberIds)],
    tax,
    charges,
    notes: notes.trim(),
    shareWeights: shareWeights,
    createdAt: nowIso()
  };
}

export function createCharge({ amount, payerMemberId, note = '' }) {
  return {
    id: id('chg'),
    amount: Number(amount),
    payerMemberId,
    note: note.trim(),
    createdAt: nowIso()
  };
}

export function migrateTrip(rawTrip) {
  if (!rawTrip || typeof rawTrip !== 'object') return null;
  const trip = {
    ...rawTrip,
    schemaVersion: rawTrip.schemaVersion || 1,
    dateCalendar: rawTrip.dateCalendar || 'jalali',
    currency: rawTrip.currency || 'toman',
    tripDate: rawTrip.tripDate || null,
    archived: rawTrip.archived === true,
    families: Array.isArray(rawTrip.families) ? rawTrip.families : [],
    expenses: Array.isArray(rawTrip.expenses) ? rawTrip.expenses : [],
    settledTransfers: Array.isArray(rawTrip.settledTransfers) ? rawTrip.settledTransfers : []
  };

  trip.expenses = trip.expenses.map((expense) => ({
    ...expense,
    date: expense.date || null,
    participantMemberIds: [...new Set(expense.participantMemberIds || [])],
    charges: Array.isArray(expense.charges) ? expense.charges : [],
    shareWeights: expense.shareWeights || null
  }));

  return trip;
}

export function nextFamilyColor(families) {
  const index = families.length % FAMILY_COLORS.length;
  return FAMILY_COLORS[index];
}
