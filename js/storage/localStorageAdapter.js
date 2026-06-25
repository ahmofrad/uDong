const INDEX_KEY = 'dong:trips:index';
const tripKey = (tripId) => `dong:trip:${tripId}`;

export function loadTripIndex() {
  return readJson(INDEX_KEY, []);
}

export function saveTripIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadTrip(tripId) {
  return readJson(tripKey(tripId), null);
}

export function saveTrip(trip) {
  localStorage.setItem(tripKey(trip.id), JSON.stringify(trip));
  const index = loadTripIndex().filter((item) => item.id !== trip.id);
  index.unshift({ id: trip.id, name: trip.name, archived: trip.archived === true, updatedAt: new Date().toISOString() });
  saveTripIndex(index);
}

export function deleteTrip(tripId) {
  localStorage.removeItem(tripKey(tripId));
  saveTripIndex(loadTripIndex().filter((item) => item.id !== tripId));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
