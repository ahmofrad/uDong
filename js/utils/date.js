function gregorianToJd(year, month, day) {
  const a = Math.trunc((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.trunc((153 * m + 2) / 5) + 365 * y + Math.trunc(y / 4) - Math.trunc(y / 100) + Math.trunc(y / 400) - 32045;
}

function jdToGregorian(jd) {
  const a = jd + 32044;
  const b = Math.trunc((4 * a + 3) / 146097);
  const c = a - Math.trunc(146097 * b / 4);
  const d = Math.trunc((4 * c + 3) / 1461);
  const e = c - Math.trunc(1461 * d / 4);
  const m = Math.trunc((5 * e + 2) / 153);
  const day = e - Math.trunc((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.trunc(m / 10);
  const year = 100 * b + d - 4800 + Math.trunc(m / 10);
  return { year, month, day };
}

function jalaliToJd(year, month, day) {
  const epbase = year - (year >= 0 ? 474 : 473);
  const epyear = 474 + (epbase % 2820);
  return day +
    (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) +
    Math.trunc((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.trunc(epbase / 2820) * 1029983 +
    1948320;
}

function jdToJalali(jd) {
  const depoch = jd - jalaliToJd(475, 1, 1);
  const cycle = Math.trunc(depoch / 1029983);
  const cyear = depoch % 1029983;
  let ycycle;
  if (cyear < 2816) {
    ycycle = Math.trunc(cyear / 366);
  } else {
    ycycle = Math.trunc((cyear - 2816) / 365) + 7;
  }
  let year = 475 + cycle * 2820 + ycycle + 1;
  let jdFarvardin = jalaliToJd(year, 1, 1);
  if (jd < jdFarvardin) {
    year -= 1;
    jdFarvardin = jalaliToJd(year, 1, 1);
  }
  const dayOfYear = jd - jdFarvardin;
  const month = dayOfYear < 186 ? Math.trunc(dayOfYear / 31) + 1 : Math.min(Math.trunc((dayOfYear - 186) / 30) + 7, 12);
  const day = dayOfYear - (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) + 1;
  return { year, month, day };
}

export function jalaliToGregorian(jy, jm, jd) {
  const jdn = jalaliToJd(jy, jm, jd);
  const { year, month, day } = jdToGregorian(jdn);
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return iso;
}

export function gregorianToJalali(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const jdn = gregorianToJd(y, m, d);
  const { year, month, day } = jdToJalali(jdn);
  return { year, month, day };
}

export function isIsoDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const yr = parseInt(value.slice(0, 4), 10);
  if (yr < 1800 || yr > 2200) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseDate(value, calendar = 'jalali') {
  if (!value || !value.trim()) return null;
  let str = String(value).trim()
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\//g, '-');
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return null;
  const parts = str.split('-').map(Number);
  if (calendar === 'jalali') {
    return jalaliToGregorian(parts[0], parts[1], parts[2]);
  }
  const iso = `${String(parts[0]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

export function formatDate(value, calendar = 'jalali', language = 'fa') {
  if (!value) return language === 'fa' ? 'بدون تاریخ' : 'No date';
  if (!isIsoDate(value)) return language === 'fa' ? 'تاریخ نامعتبر' : 'Invalid date';
  const locale = calendar === 'jalali'
    ? `${language === 'fa' ? 'fa-IR' : 'en-US'}-u-ca-persian`
    : language === 'fa' ? 'fa-IR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

export function dateInputValue(value, calendar = 'jalali', language = 'fa') {
  if (!value) return '';
  if (calendar === 'gregorian') return value;
  if (!isIsoDate(value)) return value;
  const { year, month, day } = gregorianToJalali(value);
  const digits = language === 'fa'
    ? (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
    : (n) => String(n);
  return `${digits(year)}-${digits(String(month).padStart(2, '0'))}-${digits(String(day).padStart(2, '0'))}`;
}
