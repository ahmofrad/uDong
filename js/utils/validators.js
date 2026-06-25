import { isIsoDate } from './date.js';

export function validateTrip(trip) {
  const errors = [];
  if (!trip?.name?.trim()) errors.push('tripName');
  if (!['jalali', 'gregorian'].includes(trip?.dateCalendar)) errors.push('dateCalendar');
  if (!['toman', 'usd', 'eur'].includes(trip?.currency)) errors.push('currency');
  if (trip?.tripDate && !isIsoDate(trip.tripDate)) errors.push('tripDate');
  if (!trip?.families?.length) errors.push('families');
  if (trip?.families?.some((family) => !family.members?.length)) errors.push('members');
  return errors;
}

export function isExpenseValid(expense) {
  return Boolean(
    expense?.title?.trim()
    && expense.participantMemberIds?.length
    && expense.charges?.some((charge) => charge.amount > 0 && charge.payerMemberId)
    && (expense.date == null || isIsoDate(expense.date))
    && isTaxValid(expense.tax)
  );
}

export function isTaxValid(tax) {
  if (!tax) return true;
  if (tax.type === 'percent') return tax.value >= 0 && tax.value <= 100;
  if (tax.type === 'fixed') return tax.value >= 0;
  return false;
}
