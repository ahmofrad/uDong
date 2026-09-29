import { store, openTrip, deleteStoredTrip, getTripPreview } from '../state/store.js';
import { saveTrip, loadTripIndex } from '../storage/localStorageAdapter.js';
import { sanitizeTrip } from '../state/schema.js';
import { t } from '../utils/i18n.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderTripList() {
  const { state } = ctx;
  const index = store.tripIndex;
  const showArchived = state.showArchived || false;
  const filtered = showArchived ? index : index.filter((e) => !e.archived);
  return `
    <section class="panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'myTrips')}</h2>
        <button class="button secondary" data-action="new-trip">${ctx.icon('plus')}${t(store.language, 'newTripShort')}</button>
      </div>
      ${store.tripIndex.some((e) => e.archived) ? `
        <label style="display:flex;align-items:center;gap:var(--space-2);font-size:0.85em;margin-block-end:var(--space-2);cursor:pointer">
          <input type="checkbox" id="show-archived" ${showArchived ? 'checked' : ''} style="width:16px;min-height:16px">
          ${t(store.language, 'archived')}
        </label>
      ` : ''}
      ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
      <div class="inline-actions" style="margin-block:var(--space-3)">
        <button class="button secondary" id="backup-all-trips" ${store.tripIndex.length === 0 ? 'disabled' : ''}>${ctx.icon('download')}${t(store.language, 'backupAllTrips')}</button>
        <label class="button secondary">
          ${ctx.icon('upload')}${t(store.language, 'restoreTrips')}
          <input id="restore-trips" type="file" accept="application/json" hidden>
        </label>
      </div>
      ${filtered.length ? `
        <div class="trip-card-grid">
          ${filtered.map((entry) => {
            const trip = getTripPreview(entry.id);
            if (!trip) return '';
            const familyCount = trip.families.length;
            const memberCount = trip.families.reduce((s, f) => s + f.members.length, 0);
            const expenseCount = trip.expenses.length;
            return `
              <article class="card trip-card ${entry.archived ? 'archived' : ''}" data-trip-id="${entry.id}">
                <div class="inline-actions" style="margin-block-end:var(--space-2)">
                  <h3>${ctx.escapeHtml(entry.name)}${entry.archived ? ` <span class="chip" style="font-size:0.7rem;opacity:0.7">${t(store.language, 'archived')}</span>` : ''}</h3>
                  <div style="display:flex;gap:var(--space-1)">
                    <button class="icon-button" data-archive-trip="${entry.id}" aria-label="${entry.archived ? t(store.language, 'unarchive') : t(store.language, 'archiveTrip')}" title="${entry.archived ? t(store.language, 'unarchive') : t(store.language, 'archiveTrip')}">${ctx.icon('archive')}</button>
                    <button class="icon-button" data-delete-trip="${entry.id}" aria-label="${t(store.language, 'deleteTrip')}" title="${t(store.language, 'deleteTrip')}">${ctx.icon('trash')}</button>
                  </div>
                </div>
                <p class="muted" style="font-size:0.9em">
                  ${t(store.language, trip.dateCalendar || 'jalali')} · ${t(store.language, trip.currency || 'toman')}
                </p>
                <p class="muted" style="font-size:0.85em">
                  ${familyCount} ${store.language === 'fa' ? 'خانواده' : 'families'} · ${memberCount} ${store.language === 'fa' ? 'نفر' : 'members'}
                </p>
                <p class="muted" style="font-size:0.85em">
                  ${expenseCount} ${store.language === 'fa' ? 'هزینه' : 'expenses'}
                </p>
                <div class="inline-actions" style="margin-block-start:var(--space-3)">
                  <button class="button primary" data-open-trip="${entry.id}" style="flex:1">${ctx.icon('route')}${t(store.language, 'goToTrip')}</button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      ` : `
        <p class="muted">${t(store.language, 'noTripsYet')}</p>
      `}
    </section>
  `;
}

export function bindTripListEvents() {
  const { app, state, render } = ctx;
  app.querySelector('[data-action="new-trip"]')?.addEventListener('click', () => {
    state.tripDraft = { tripName: '', dateCalendar: 'jalali', tripDate: '', currency: 'toman' };
    state.familyDraft = [{ name: '', members: [] }];
    store.view = 'newTrip';
    render();
  });
  app.querySelectorAll('[data-open-trip]').forEach((btn) => {
    btn.addEventListener('click', () => openTrip(btn.dataset.openTrip));
  });
  app.querySelectorAll('[data-delete-trip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteTrip;
      const name = store.tripIndex.find((e) => e.id === id)?.name || '';
      if (confirm(`${t(store.language, 'confirmDeleteTrip')}\n"${name}"`)) {
        deleteStoredTrip(id);
        ctx.showToast(t(store.language, 'tripDeleted'));
      }
    });
  });
  app.querySelectorAll('[data-archive-trip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.archiveTrip;
      const tripData = getTripPreview(id);
      if (tripData) {
        tripData.archived = !tripData.archived;
        saveTrip(tripData);
        store.tripIndex = loadTripIndex();
        render();
      }
    });
  });
  app.querySelector('#show-archived')?.addEventListener('change', (e) => {
    state.showArchived = e.target.checked;
    render();
  });
  app.querySelector('#backup-all-trips')?.addEventListener('click', exportAllTripsBackup);
  app.querySelector('#restore-trips')?.addEventListener('change', restoreTripsBackup);
}

function exportAllTripsBackup() {
  const trips = store.tripIndex.map((entry) => getTripPreview(entry.id)).filter(Boolean);
  const blob = new Blob([JSON.stringify(trips, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dong-all-trips-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

function restoreTripsBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    const data = JSON.parse(text);
    const trips = Array.isArray(data) ? data : [data];
    let count = 0;
    for (const raw of trips) {
      const clean = sanitizeTrip(raw);
      if (clean) {
        saveTrip(clean);
        count++;
      }
    }
    if (count === 0) {
      ctx.showToast(store.language === 'fa' ? 'فایل معتبر نیست.' : 'Invalid file.');
      return;
    }
    store.tripIndex = loadTripIndex();
    ctx.render();
    ctx.showToast(
      store.language === 'fa'
        ? `${count} سفر بازیابی شد.`
        : `${count} trip(s) restored.`
    );
  }).catch(() => {
    ctx.showToast(store.language === 'fa' ? 'فایل معتبر نیست.' : 'Invalid file.');
  });
  event.target.value = '';
}
