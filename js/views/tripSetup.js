import { store, setTrip } from '../state/store.js';
import { createTrip, createFamily, createMember, nextFamilyColor } from '../state/schema.js';
import { parseDate } from '../utils/date.js';
import { t } from '../utils/i18n.js';
import { validateTrip } from '../utils/validators.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderTripSetup() {
  const { state } = ctx;
  const draft = state.familyDraft;
  return `
    <section class="panel">
      <h2>${t(store.language, 'newTrip')}</h2>
      <p class="muted">${t(store.language, 'noTrip')}</p>
      ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
      <form id="trip-form" class="form-grid">
        <label class="field">
          <span>${t(store.language, 'tripName')}</span>
          <input name="tripName" required value="${ctx.escapeAttr(state.tripDraft.tripName)}">
        </label>
        <label class="field">
          <span>${t(store.language, 'calendar')}</span>
          <select name="dateCalendar">
            <option value="jalali" ${ctx.selected(state.tripDraft.dateCalendar, 'jalali')}>${t(store.language, 'jalali')}</option>
            <option value="gregorian" ${ctx.selected(state.tripDraft.dateCalendar, 'gregorian')}>${t(store.language, 'gregorian')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'tripDate')}</span>
          ${ctx.dateInputHtml('tripDate', state.tripDraft.tripDate, state.tripDraft.dateCalendar)}
        </label>
        <label class="field">
          <span>${t(store.language, 'currency')}</span>
          <select name="currency" required>
            <option value="toman" ${ctx.selected(state.tripDraft.currency, 'toman')}>${t(store.language, 'toman')}</option>
            <option value="usd" ${ctx.selected(state.tripDraft.currency, 'usd')}>${t(store.language, 'usd')}</option>
            <option value="eur" ${ctx.selected(state.tripDraft.currency, 'eur')}>${t(store.language, 'eur')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'language')}</span>
          <select data-pref="language">
            <option value="fa" ${ctx.selected(store.language, 'fa')}>فارسی</option>
            <option value="en" ${ctx.selected(store.language, 'en')}>English</option>
          </select>
        </label>
        <div class="full">
          <div class="inline-actions">
            <h3>${t(store.language, 'families')}</h3>
            <button class="button secondary" type="button" id="add-family-row">${ctx.icon('plus')}${t(store.language, 'addFamily')}</button>
          </div>
          <div class="list">
            ${draft.map((family, index) => renderFamilyDraftRow(family, index)).join('')}
          </div>
        </div>
        <button class="button full" type="submit">${ctx.icon('wallet')}${t(store.language, 'createTrip')}</button>
      </form>
    </section>
  `;
}

function renderFamilyDraftRow(family, index) {
  return `
    <div class="card form-grid" data-family-row="${index}">
      <label class="field">
        <span>${t(store.language, 'familyName')}</span>
        <input name="familyName" value="${ctx.escapeAttr(family.name)}" placeholder="${store.language === 'fa' ? 'خانواده احمدی' : 'Ahmadi family'}">
      </label>
      <div class="field" style="grid-column:1/-1">
        <span>${t(store.language, 'memberNames')}</span>
        <div class="member-list" style="margin-block-end:var(--space-2)">
          ${family.members.map((name, mIdx) => `
            <span class="chip" data-draft-member="${index}:${mIdx}">
              <span class="avatar" style="--chip-color:#888">${ctx.initial(name)}</span>
              <input class="draft-member-name" value="${ctx.escapeAttr(name)}" data-family-index="${index}" data-member-index="${mIdx}" style="width:auto;min-width:60px;border:none;background:transparent;color:inherit">
              <button class="icon-button" style="width:24px;height:24px;min-height:24px;border:none" type="button" data-remove-draft-member="${index}:${mIdx}" aria-label="${t(store.language, 'confirmDelete')}">${ctx.icon('trash')}</button>
            </span>
          `).join('')}
        </div>
        <div class="inline-actions" style="gap:var(--space-2)">
          <input class="new-draft-member" placeholder="${t(store.language, 'memberName') || 'Name'}" style="flex:1;min-height:36px" data-family-index="${index}">
          <button class="button secondary" type="button" data-add-draft-member="${index}">${ctx.icon('plus')}${t(store.language, 'addMember')}</button>
        </div>
      </div>
      ${index > 0 ? `<button class="icon-button" type="button" data-remove-family="${index}" aria-label="Remove">${ctx.icon('trash')}</button>` : ''}
    </div>
  `;
}

export function bindTripSetupEvents() {
  const { app, state, render } = ctx;
  const form = app.querySelector('#trip-form');
  if (!form) return;

  form.addEventListener('input', () => {
    syncTripDraft();
    syncFamilyDraft();
  });
  app.querySelector('#add-family-row')?.addEventListener('click', () => {
    syncTripDraft();
    syncFamilyDraft();
    state.familyDraft.push({ name: '', members: [] });
    render();
  });
  app.querySelectorAll('[data-remove-family]').forEach((button) => {
    button.addEventListener('click', () => {
      syncTripDraft();
      syncFamilyDraft();
      state.familyDraft.splice(Number(button.dataset.removeFamily), 1);
      render();
    });
  });
  app.querySelectorAll('[data-add-draft-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      syncTripDraft();
      syncFamilyDraft();
      const fi = Number(btn.dataset.addDraftMember);
      const input = app.querySelector(`.new-draft-member[data-family-index="${fi}"]`);
      if (!input) return;
      const name = input.value.trim();
      if (!name) return;
      state.familyDraft[fi].members.push(name);
      render();
    });
  });
  app.querySelectorAll('[data-remove-draft-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      syncTripDraft();
      syncFamilyDraft();
      const [fi, mi] = btn.dataset.removeDraftMember.split(':').map(Number);
      state.familyDraft[fi].members.splice(mi, 1);
      render();
    });
  });
  app.querySelectorAll('.new-draft-member').forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const fi = input.dataset.familyIndex;
        const btn = document.querySelector(`[data-add-draft-member="${fi}"]`);
        btn?.click();
      }
    });
  });
  form.querySelector('[name="dateCalendar"]')?.addEventListener('change', () => {
    syncTripDraft();
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncTripDraft();
    syncFamilyDraft();
    const data = new FormData(form);
    const dateCalendar = data.get('dateCalendar');
    const rawDate = data.get('tripDate');
    const tripDate = parseDate(rawDate, dateCalendar) || rawDate || null;
    const trip = createTrip({
      name: data.get('tripName'),
      dateCalendar,
      currency: data.get('currency'),
      tripDate
    });
    for (const familyDraft of state.familyDraft) {
      if (!familyDraft.name.trim()) continue;
      const family = createFamily({ name: familyDraft.name, colorHex: nextFamilyColor(trip.families) });
      family.members = familyDraft.members.filter(Boolean).map((name) => createMember({ familyId: family.id, name }));
      trip.families.push(family);
    }
    const errors = validateTrip(trip);
    if (errors.length) {
      state.lastError = t(store.language, 'invalidTrip');
      render();
      return;
    }
    state.lastError = '';
    state.tripDraft = { tripName: '', dateCalendar: 'jalali', tripDate: '', currency: 'toman' };
    state.familyDraft = [{ name: '', members: [] }];
    setTrip(trip);
  });
}

function syncTripDraft() {
  const { app, state } = ctx;
  const form = app.querySelector('#trip-form');
  if (!form) return;
  const data = new FormData(form);
  state.tripDraft = {
    tripName: data.get('tripName') || '',
    dateCalendar: data.get('dateCalendar') || 'jalali',
    tripDate: data.get('tripDate') || '',
    currency: data.get('currency') || 'toman'
  };
}

function syncFamilyDraft() {
  const { app, state } = ctx;
  state.familyDraft = [...app.querySelectorAll('[data-family-row]')].map((row) => ({
    name: row.querySelector('[name="familyName"]').value,
    members: [...row.querySelectorAll('.draft-member-name')].map((input) => input.value)
  }));
}
