const CURRENCY_META = {
  toman: { label: { fa: 'تومان', en: 'Toman' }, code: 'IRR', fractionDigits: 0 },
  usd: { label: { fa: 'دلار', en: 'USD' }, code: 'USD', fractionDigits: 2 },
  eur: { label: { fa: 'یورو', en: 'EUR' }, code: 'EUR', fractionDigits: 2 }
};

export function currencyMeta(currency) {
  return CURRENCY_META[currency] || CURRENCY_META.toman;
}

export function toMinorUnit(value, currency = 'toman') {
  const meta = currencyMeta(currency);
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 10 ** meta.fractionDigits);
}

export function fromMinorUnit(value, currency = 'toman') {
  const meta = currencyMeta(currency);
  return Number(value || 0) / 10 ** meta.fractionDigits;
}

export function formatMoney(value, currency = 'toman', language = 'fa', digits = 'latin') {
  const meta = currencyMeta(currency);
  const locale = language === 'fa' && digits === 'persian' ? 'fa-IR' : 'en-US';
  const amount = fromMinorUnit(value, currency);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: meta.fractionDigits,
    maximumFractionDigits: meta.fractionDigits
  }).format(amount);
  return language === 'fa'
    ? `${formatted} ${meta.label.fa}`
    : `${formatted} ${meta.label.en}`;
}

export function formatInputValue(raw) {
  let str = String(raw ?? '').replace(/,/g, '').trim();
  if (!str) return '';
  str = str.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  str = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\D/g, '');
  if (parts.length > 1) {
    parts[1] = parts[1].replace(/\D/g, '').slice(0, 2);
    if (!parts[1]) parts.pop();
  }
  if (!parts[0]) return parts.length > 1 ? `0.${parts[1]}` : '';
  const withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${withCommas}.${parts[1]}` : withCommas;
}

export function parseAmountInput(value, currency = 'toman') {
  const normalized = String(value)
    .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/,/g, '')
    .trim();
  return toMinorUnit(normalized, currency);
}
