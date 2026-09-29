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

// Deep-validate and normalize an untrusted trip object (e.g. from a JSON
// restore file). Returns a clean, migrated trip, or null if it is unusable.
// Coerces arrays, drops malformed members/families/expenses/charges, and
// clamps calendar/currency to known values so a bad backup can never crash
// the dashboard.
export function sanitizeTrip(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;

  const trip = migrateTrip(raw);
  trip.id = raw.id.trim();
  trip.name = raw.name.trim();

  trip.families = (Array.isArray(trip.families) ? trip.families : [])
    .filter((family) => family && typeof family === 'object' && typeof family.id === 'string' && family.id.trim())
    .map((family) => ({
      id: family.id.trim(),
      name: typeof family.name === 'string' && family.name.trim() ? family.name.trim() : 'Family',
      colorHex: typeof family.colorHex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(family.colorHex) ? family.colorHex : '#0f766e',
      members: (Array.isArray(family.members) ? family.members : [])
        .filter((m) => m && typeof m === 'object' && typeof m.id === 'string' && m.id.trim())
        .map((m) => ({
          id: m.id.trim(),
          familyId: family.id.trim(),
          name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : 'Member'
        }))
    }));

  const memberIds = new Set(trip.families.flatMap((f) => f.members.map((m) => m.id)));

  trip.expenses = (Array.isArray(trip.expenses) ? trip.expenses : [])
    .filter((expense) => expense && typeof expense === 'object' && typeof expense.id === 'string' && expense.id.trim())
    .map((expense) => {
      const charges = (Array.isArray(expense.charges) ? expense.charges : [])
        .filter((c) => c && typeof c === 'object' && Number.isFinite(Number(c.amount)) && Number(c.amount) >= 0)
        .filter((c) => typeof c.payerMemberId === 'string' && memberIds.has(c.payerMemberId))
        .map((c) => ({
          id: typeof c.id === 'string' && c.id ? c.id : id('chg'),
          amount: Math.round(Number(c.amount)),
          payerMemberId: c.payerMemberId,
          note: typeof c.note === 'string' ? c.note : '',
          createdAt: typeof c.createdAt === 'string' ? c.createdAt : nowIso()
        }));
      return {
        id: expense.id.trim(),
        title: typeof expense.title === 'string' ? expense.title.trim() : '',
        icon: typeof expense.icon === 'string' ? expense.icon : 'other',
        date: typeof expense.date === 'string' && expense.date ? expense.date : null,
        participantMemberIds: [...new Set((Array.isArray(expense.participantMemberIds) ? expense.participantMemberIds : []).filter((pid) => memberIds.has(pid)))],
        tax: sanitizeTax(expense.tax),
        shareWeights: expense.shareWeights && typeof expense.shareWeights === 'object' && !Array.isArray(expense.shareWeights) ? expense.shareWeights : null,
        charges,
        notes: typeof expense.notes === 'string' ? expense.notes : '',
        createdAt: typeof expense.createdAt === 'string' ? expense.createdAt : nowIso()
      };
    });

  trip.settledTransfers = Array.isArray(trip.settledTransfers)
    ? trip.settledTransfers.filter((k) => typeof k === 'string')
    : [];

  return trip;
}

function sanitizeTax(tax) {
  if (!tax || typeof tax !== 'object') return null;
  const value = Number(tax.value);
  if (!Number.isFinite(value)) return null;
  if (tax.type === 'percent') return value >= 0 && value <= 100 ? { type: 'percent', value } : null;
  if (tax.type === 'fixed') return value >= 0 ? { type: 'fixed', value: Math.round(value) } : null;
  return null;
}

export function nextFamilyColor(families) {
  const index = families.length % FAMILY_COLORS.length;
  return FAMILY_COLORS[index];
}
