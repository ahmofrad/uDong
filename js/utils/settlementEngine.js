import { isExpenseValid } from './validators.js';

export function calculateExpenseTotal(expense) {
  const chargesTotal = sum(expense.charges?.map((charge) => charge.amount) || []);
  const taxAmount = calculateTaxAmount(chargesTotal, expense.tax);
  return { chargesTotal, taxAmount, expenseTotal: chargesTotal + taxAmount };
}

export function calculateTaxAmount(chargesTotal, tax) {
  if (!tax) return 0;
  if (tax.type === 'fixed') return Math.round(tax.value);
  if (tax.type === 'percent') return Math.round(chargesTotal * tax.value / 100);
  return 0;
}

export function calculateSettlement(trip, epsilon = 1) {
  const members = flattenMembers(trip.families);
  const memberToFamily = new Map(members.map((member) => [member.id, member.familyId]));
  const memberBalance = Object.fromEntries(members.map((member) => [member.id, 0]));
  const skippedExpenseIds = [];

  for (const expense of trip.expenses || []) {
    if (!isExpenseValid(expense)) {
      skippedExpenseIds.push(expense.id);
      continue;
    }

    const participantIds = [...new Set(expense.participantMemberIds)]
      .filter((memberId) => memberBalance[memberId] !== undefined);
    if (!participantIds.length) {
      skippedExpenseIds.push(expense.id);
      continue;
    }

    const { expenseTotal, taxAmount } = calculateExpenseTotal(expense);
    const shares = splitWithWeights(expenseTotal, participantIds, expense.shareWeights);
    for (const [memberId, share] of shares) {
      memberBalance[memberId] -= share;
    }

    for (const charge of expense.charges) {
      if (memberBalance[charge.payerMemberId] === undefined) continue;
      memberBalance[charge.payerMemberId] += Math.round(charge.amount);
    }

    // Credit the tax back to whoever fronted the charges, proportional to
    // how much each payer paid, so the ledger stays zero-sum and the tax is
    // actually reimbursed through the settlement.
    if (taxAmount > 0) {
      const taxCredits = distributeTaxCredit(taxAmount, expense.charges);
      for (const [payerId, credit] of taxCredits) {
        if (memberBalance[payerId] === undefined) continue;
        memberBalance[payerId] += credit;
      }
    }
  }

  const familyBalance = Object.fromEntries((trip.families || []).map((family) => [family.id, 0]));
  for (const [memberId, balance] of Object.entries(memberBalance)) {
    const familyId = memberToFamily.get(memberId);
    if (familyId && familyBalance[familyId] !== undefined) {
      familyBalance[familyId] += balance;
    }
  }

  return {
    memberBalance,
    familyBalance,
    transfers: simplifyDebts(familyBalance, epsilon),
    skippedExpenseIds
  };
}

export function simplifyDebts(familyBalance, epsilon = 1) {
  const creditors = [];
  const debtors = [];

  for (const [familyId, balance] of Object.entries(familyBalance)) {
    const rounded = Math.round(balance);
    if (rounded > epsilon) creditors.push({ familyId, balance: rounded });
    if (rounded < -epsilon) debtors.push({ familyId, balance: -rounded });
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const transfers = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > epsilon) {
      transfers.push({ from: debtor.familyId, to: creditor.familyId, amount });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;
    if (creditor.balance <= epsilon) creditorIndex += 1;
    if (debtor.balance <= epsilon) debtorIndex += 1;
  }

  return transfers;
}

export function recalculateShares({ participantIds, lockedIds = [], fixedAmounts = {}, totalExpense }) {
  const lockedSet = new Set(lockedIds);
  const result = [];
  let lockedTotal = 0;
  for (const id of participantIds) {
    if (lockedSet.has(id)) {
      const amount = Math.round(fixedAmounts[id] || 0);
      lockedTotal += amount;
      result.push({ memberId: id, amount, weight: 0 });
    } else {
      result.push({ memberId: id, amount: 0, weight: 0 });
    }
  }
  const unlockedCount = participantIds.length - lockedSet.size;
  let remaining = Math.max(0, Math.round(totalExpense) - lockedTotal);
  const base = unlockedCount > 0 ? Math.trunc(remaining / unlockedCount) : 0;
  let remainder = remaining - base * unlockedCount;
  for (const item of result) {
    if (lockedSet.has(item.memberId)) continue;
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    item.amount = base + extra;
  }
  const equalShare = totalExpense > 0 ? totalExpense / participantIds.length : 1;
  for (const item of result) {
    item.weight = Math.max(1, Math.round(item.amount / equalShare * 100));
  }
  return result;
}

// Split a tax amount across the charges that fronted it, in proportion to
// each charge's amount. Payers with multiple charges accumulate one credit.
// Remainder goes to the largest charge so the credits sum exactly to taxAmount.
function distributeTaxCredit(taxAmount, charges = []) {
  const valid = charges.filter((c) => Math.round(c.amount) > 0);
  const total = valid.reduce((s, c) => s + Math.round(c.amount), 0);
  const credits = new Map();
  if (total <= 0) return credits;

  let allocated = 0;
  let largest = null;
  for (const charge of valid) {
    const amount = Math.round(charge.amount);
    const exact = taxAmount * amount / total;
    const credit = Math.trunc(exact);
    allocated += credit;
    credits.set(charge.payerMemberId, (credits.get(charge.payerMemberId) || 0) + credit);
    if (!largest || amount > largest.amount) largest = { payerMemberId: charge.payerMemberId, amount };
  }
  let remainder = taxAmount - allocated;
  if (largest) {
    credits.set(largest.payerMemberId, (credits.get(largest.payerMemberId) || 0) + remainder);
  }
  return credits;
}

function splitIntegerAmount(total, ids) {
  const base = Math.trunc(total / ids.length);
  let remainder = total - base * ids.length;
  return ids.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return [memberId, base + extra];
  });
}

function splitWithWeights(total, ids, weights) {
  if (!weights) return splitIntegerAmount(total, ids);
  const weightSum = ids.reduce((sum, id) => sum + (weights[id] || 1), 0);
  if (weightSum <= 0) return splitIntegerAmount(total, ids);
  const shares = ids.map((id) => [id, Math.trunc(total * (weights[id] || 1) / weightSum)]);
  const allocated = shares.reduce((sum, [, s]) => sum + s, 0);
  let remainder = total - allocated;
  let idx = 0;
  while (remainder > 0 && idx < 100) {
    shares[idx % shares.length][1] += 1;
    remainder -= 1;
    idx += 1;
  }
  return shares;
}

export function calculatePerFamilyPaid(trip) {
  const memberToFamily = new Map();
  for (const family of trip.families || []) {
    for (const member of family.members || []) {
      memberToFamily.set(member.id, family.id);
    }
  }
  const familyPaid = Object.fromEntries((trip.families || []).map((f) => [f.id, 0]));
  const familyShare = Object.fromEntries((trip.families || []).map((f) => [f.id, 0]));
  for (const expense of trip.expenses || []) {
    if (!isExpenseValid(expense)) continue;
    const { expenseTotal } = calculateExpenseTotal(expense);
    const participants = expense.participantMemberIds || [];
    const shares = splitWithWeights(expenseTotal, participants, expense.shareWeights);
    for (const [pid, share] of shares) {
      const fId = memberToFamily.get(pid);
      if (fId && familyShare[fId] !== undefined) familyShare[fId] += share;
    }
    for (const charge of expense.charges || []) {
      const fId = memberToFamily.get(charge.payerMemberId);
      if (fId && familyPaid[fId] !== undefined) familyPaid[fId] += Math.round(charge.amount);
    }
  }
  const total = Object.values(familyPaid).reduce((a, b) => a + b, 0);
  return (trip.families || []).map((family) => ({
    familyId: family.id,
    familyName: family.name,
    colorHex: family.colorHex,
    paid: familyPaid[family.id] || 0,
    share: familyShare[family.id] || 0,
    total,
    pct: total > 0 ? Math.round((familyPaid[family.id] || 0) / total * 100) : 0
  }));
}

export function calculatePerPersonPaid(trip) {
  const memberPaid = {};
  for (const expense of trip.expenses || []) {
    if (!isExpenseValid(expense)) continue;
    for (const charge of expense.charges || []) {
      memberPaid[charge.payerMemberId] = (memberPaid[charge.payerMemberId] || 0) + Math.round(charge.amount);
    }
  }
  const allMembers = (trip.families || []).flatMap((f) => f.members || []);
  const memberToFamily = Object.fromEntries(allMembers.map((m) => [m.id, m.familyId]));
  const total = Object.values(memberPaid).reduce((a, b) => a + b, 0);
  return allMembers
    .map((member) => ({
      memberId: member.id,
      memberName: member.name,
      familyId: member.familyId,
      paid: memberPaid[member.id] || 0,
      total,
      pct: total > 0 ? Math.round((memberPaid[member.id] || 0) / total * 100) : 0
    }))
    .filter((m) => m.paid > 0)
    .sort((a, b) => b.paid - a.paid);
}

function flattenMembers(families = []) {
  return families.flatMap((family) => family.members || []);
}

function sum(values) {
  return values.reduce((total, value) => total + Math.round(Number(value) || 0), 0);
}
