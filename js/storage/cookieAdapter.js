export function getCookie(name, fallback = null) {
  const value = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  return value ? decodeURIComponent(value) : fallback;
}

export function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export const preferences = {
  get activeTripId() {
    return getCookie('dong_active_trip_id');
  },
  set activeTripId(value) {
    setCookie('dong_active_trip_id', value || '');
  },
  get language() {
    return getCookie('dong_language', 'fa');
  },
  set language(value) {
    setCookie('dong_language', value);
  },
  get theme() {
    return getCookie('dong_theme', 'light');
  },
  set theme(value) {
    setCookie('dong_theme', value);
  },
  get digits() {
    return getCookie('dong_digits', 'latin');
  },
  set digits(value) {
    setCookie('dong_digits', value);
  }
};
