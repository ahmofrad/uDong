import { preferences } from '../storage/cookieAdapter.js';
import { loadTrip, loadTripIndex, saveTrip, deleteTrip as storageDeleteTrip } from '../storage/localStorageAdapter.js';
import { migrateTrip } from './schema.js';

const listeners = new Set();

export const store = {
  trip: null,
  tripIndex: [],
  language: preferences.language === 'en' ? 'en' : 'fa',
  theme: preferences.theme === 'dark' ? 'dark' : 'light',
  digits: preferences.digits === 'persian' ? 'persian' : 'latin',
  view: 'tripList'
};

export function initStore() {
  store.tripIndex = loadTripIndex();
  store.trip = null;
  const activeId = preferences.activeTripId;
  if (activeId) {
    const trip = migrateTrip(loadTrip(activeId));
    if (trip) {
      store.trip = trip;
      preferences.activeTripId = trip.id;
      store.view = 'dashboard';
    } else {
      preferences.activeTripId = '';
      store.view = store.tripIndex.length ? 'tripList' : 'newTrip';
    }
  } else {
    store.view = store.tripIndex.length ? 'tripList' : 'newTrip';
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setView(view) {
  store.view = view;
  emit();
}

export function setPreference(key, value) {
  if (!['language', 'theme', 'digits'].includes(key)) return;
  store[key] = value;
  preferences[key] = value;
  emit();
}

export function setTrip(trip) {
  store.trip = migrateTrip(trip);
  if (store.trip) {
    saveTrip(store.trip);
    preferences.activeTripId = store.trip.id;
    store.tripIndex = loadTripIndex();
    store.view = 'dashboard';
  }
  emit();
}

export function updateTrip(mutator) {
  if (!store.trip) return;
  const nextTrip = structuredClone(store.trip);
  mutator(nextTrip);
  setTrip(nextTrip);
}

export function importTrip(trip) {
  setTrip(migrateTrip(trip));
}

export function closeTrip() {
  store.trip = null;
  store.view = store.tripIndex.length ? 'tripList' : 'newTrip';
  preferences.activeTripId = '';
  emit();
}

export function openTrip(tripId) {
  const trip = migrateTrip(loadTrip(tripId));
  if (trip) {
    store.trip = trip;
    preferences.activeTripId = trip.id;
    store.view = 'dashboard';
    emit();
  }
}

export function deleteStoredTrip(tripId) {
  storageDeleteTrip(tripId);
  store.tripIndex = loadTripIndex();
  if (store.trip?.id === tripId) {
    store.trip = null;
    store.view = store.tripIndex.length ? 'tripList' : 'newTrip';
    preferences.activeTripId = '';
  }
  emit();
}

export function getTripPreview(tripId) {
  return loadTrip(tripId);
}

function emit() {
  for (const listener of listeners) listener(store);
}
