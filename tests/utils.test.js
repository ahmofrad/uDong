import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMoney, parseAmountInput, toMinorUnit, fromMinorUnit, currencyMeta
} from '../js/utils/currency.js';
import {
  formatDate, isIsoDate, parseDate, jalaliToGregorian, dateInputValue
} from '../js/utils/date.js';
import { directionFor, t, messages } from '../js/utils/i18n.js';
import { validateTrip, isExpenseValid, isTaxValid } from '../js/utils/validators.js';

test('currency: toMinorUnit handles each currency', () => {
  assert.equal(toMinorUnit('12500', 'toman'), 12500);
  assert.equal(toMinorUnit('12.34', 'usd'), 1234);
  assert.equal(toMinorUnit('12.34', 'eur'), 1234);
  assert.equal(toMinorUnit('0', 'toman'), 0);
  assert.equal(toMinorUnit('', 'toman'), 0);
  assert.equal(toMinorUnit('abc', 'toman'), 0);
  assert.equal(toMinorUnit('-5', 'toman'), -5);
});

test('currency: fromMinorUnit converts back correctly', () => {
  assert.equal(fromMinorUnit(12500, 'toman'), 12500);
  assert.equal(fromMinorUnit(1234, 'usd'), 12.34);
  assert.equal(fromMinorUnit(0, 'toman'), 0);
});

test('currency: parseAmountInput handles Persian and Arabic digits', () => {
  assert.equal(parseAmountInput('۱۲۵۰۰', 'toman'), 12500);
  assert.equal(parseAmountInput('۱,۲۳۴', 'toman'), 1234);
  assert.equal(parseAmountInput('٠١٢٣', 'toman'), 123);
  assert.equal(parseAmountInput('', 'toman'), 0);
  assert.equal(parseAmountInput('  ۵۰۰  ', 'toman'), 500);
});

test('currency: parseAmountInput with decimals for USD/EUR', () => {
  assert.equal(parseAmountInput('12.50', 'usd'), 1250);
  assert.equal(parseAmountInput('۱۲٫۵', 'usd'), 0);
});

test('currency: formatMoney handles zero and large values', () => {
  assert.match(formatMoney(0, 'toman', 'en'), /0/);
  assert.match(formatMoney(0, 'toman', 'fa', 'persian'), /[۰]/);
  assert.match(formatMoney(9999999, 'toman', 'en'), /9,999,999/);
});

test('currency: formatMoney with Persian digits', () => {
  const result = formatMoney(12500, 'toman', 'fa', 'persian');
  assert.match(result, /[۱۲۳۴۵۶۷۸۹۰]/);
  assert.match(result, /تومان/);
});

test('currency: currencyMeta returns fallback for unknown', () => {
  const meta = currencyMeta('unknown');
  assert.equal(meta.label.fa, 'تومان');
});

test('date: isIsoDate validation', () => {
  assert.equal(isIsoDate(null), true);
  assert.equal(isIsoDate(''), true);
  assert.equal(isIsoDate(undefined), true);
  assert.equal(isIsoDate('2026-06-24'), true);
  assert.equal(isIsoDate('2026-02-31'), false);
  assert.equal(isIsoDate('2026-13-01'), false);
  assert.equal(isIsoDate('not-a-date'), false);
  assert.equal(isIsoDate('2026/06/24'), false);
});

test('date: formatDate handles both calendars', () => {
  const gregResult = formatDate('2026-06-24', 'gregorian', 'en');
  assert.match(gregResult, /2026|Jun/);

  const jalaliResult = formatDate('2026-06-24', 'jalali', 'fa');
  assert.ok(jalaliResult.length > 0);
  assert.notEqual(jalaliResult, 'بدون تاریخ');
});

test('date: formatDate returns "No date" for null', () => {
  assert.equal(formatDate(null, 'jalali', 'fa'), 'بدون تاریخ');
  assert.equal(formatDate(null, 'gregorian', 'en'), 'No date');
  assert.equal(formatDate('', 'jalali', 'fa'), 'بدون تاریخ');
});

test('date: jalaliToGregorian round-trips correctly', () => {
  const iso = '2026-03-21';
  const gy = 2026, gm = 3, gd = 21;
  const jalali = dateInputValue(iso, 'jalali', 'en');
  const [jy, jm, jd] = jalali.split('-').map(Number);
  const roundTrip = jalaliToGregorian(jy, jm, jd);
  assert.equal(roundTrip, iso);
});

test('date: known Jalali dates convert to correct Gregorian', () => {
  assert.equal(jalaliToGregorian(1403, 1, 1), '2024-03-20');
  assert.equal(jalaliToGregorian(1403, 12, 29), '2025-03-19');
  assert.equal(jalaliToGregorian(1400, 1, 1), '2021-03-21');
});

test('date: parseDate handles Jalali and Gregorian input', () => {
  assert.equal(parseDate('1403-01-01', 'jalali'), '2024-03-20');
  assert.equal(parseDate('2024-03-20', 'gregorian'), '2024-03-20');
  assert.equal(parseDate('', 'jalali'), null);
  assert.equal(parseDate(null, 'jalali'), null);
});

test('date: parseDate rejects invalid dates', () => {
  assert.equal(parseDate('not-a-date', 'jalali'), null);
  assert.equal(parseDate('99-99-99', 'gregorian'), null);
});

test('date: dateInputValue returns empty for null', () => {
  assert.equal(dateInputValue(null, 'jalali', 'en'), '');
  assert.equal(dateInputValue(null, 'gregorian', 'en'), '');
});

test('date: dateInputValue Gregorian returns ISO directly', () => {
  assert.equal(dateInputValue('2024-03-20', 'gregorian', 'en'), '2024-03-20');
});

test('validators: validateTrip catches missing fields', () => {
  const errors = validateTrip({});
  assert.ok(errors.includes('tripName'));
  assert.ok(errors.includes('families'));
});

test('validators: validateTrip passes valid trip', () => {
  const valid = {
    name: 'Test',
    dateCalendar: 'jalali',
    currency: 'toman',
    tripDate: null,
    families: [{ name: 'A', members: [{ id: 'm1' }] }]
  };
  assert.equal(validateTrip(valid).length, 0);
});

test('validators: validateTrip rejects bad calendar and currency', () => {
  const errors = validateTrip({ name: 'X', dateCalendar: 'invalid', currency: 'bad' });
  assert.ok(errors.includes('dateCalendar'));
  assert.ok(errors.includes('currency'));
});

test('validators: isExpenseValid rejects missing fields', () => {
  assert.equal(isExpenseValid({}), false);
  assert.equal(isExpenseValid({ title: 'X', participantMemberIds: [], charges: [] }), false);
});

test('validators: isExpenseValid accepts valid expense', () => {
  const valid = {
    title: 'X',
    participantMemberIds: ['m1'],
    charges: [{ amount: 100, payerMemberId: 'm1' }],
    date: null,
    tax: null
  };
  assert.equal(isExpenseValid(valid), true);
});

test('validators: isTaxValid validates percent and fixed', () => {
  assert.equal(isTaxValid(null), true);
  assert.equal(isTaxValid({ type: 'percent', value: 50 }), true);
  assert.equal(isTaxValid({ type: 'percent', value: 100 }), true);
  assert.equal(isTaxValid({ type: 'percent', value: 0 }), true);
  assert.equal(isTaxValid({ type: 'percent', value: -1 }), false);
  assert.equal(isTaxValid({ type: 'percent', value: 101 }), false);
  assert.equal(isTaxValid({ type: 'fixed', value: 0 }), true);
  assert.equal(isTaxValid({ type: 'fixed', value: 500 }), true);
  assert.equal(isTaxValid({ type: 'fixed', value: -1 }), false);
  assert.equal(isTaxValid({ type: 'unknown', value: 0 }), false);
});

test('i18n: all fa keys have corresponding en keys', () => {
  const faKeys = Object.keys(messages.fa);
  const enKeys = new Set(Object.keys(messages.en));
  for (const key of faKeys) {
    assert.ok(enKeys.has(key), `missing en key: ${key}`);
  }
});

test('i18n: t falls back to fa key for missing language', () => {
  assert.equal(t('de', 'appName'), messages.fa.appName);
});

test('i18n: t returns the key itself as last resort', () => {
  assert.equal(t('fa', 'nonexistent_key_xyz'), 'nonexistent_key_xyz');
});

test('i18n: directionFor provides correct directions', () => {
  assert.equal(directionFor('fa'), 'rtl');
  assert.equal(directionFor('en'), 'ltr');
  assert.equal(directionFor('unknown'), 'rtl');
});
