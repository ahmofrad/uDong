import { store, updateTrip, importTrip } from '../state/store.js';
import { createFamily, createMember, nextFamilyColor, sanitizeTrip } from '../state/schema.js';
import { formatDate, parseDate } from '../utils/date.js';
import { t } from '../utils/i18n.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderSettingsView() {
  const trip = store.trip;
  return `
    <section class="panel">
      <h2>${t(store.language, 'manageTrip')}</h2>
      <form id="trip-name-form" class="form-grid">
        <label class="field">
          <span>${t(store.language, 'tripName')}</span>
          <input name="tripName" value="${ctx.escapeAttr(trip.name)}">
        </label>
        <label class="field">
          <span>${t(store.language, 'calendar')}</span>
          <select name="dateCalendar">
            <option value="jalali" ${ctx.selected(trip.dateCalendar, 'jalali')}>${t(store.language, 'jalali')}</option>
            <option value="gregorian" ${ctx.selected(trip.dateCalendar, 'gregorian')}>${t(store.language, 'gregorian')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'currency')}</span>
          <select name="currency">
            <option value="toman" ${ctx.selected(trip.currency, 'toman')}>${t(store.language, 'toman')}</option>
            <option value="usd" ${ctx.selected(trip.currency, 'usd')}>${t(store.language, 'usd')}</option>
            <option value="eur" ${ctx.selected(trip.currency, 'eur')}>${t(store.language, 'eur')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'tripDate')}</span>
          ${ctx.dateInputHtml('tripDate', trip.tripDate, trip.dateCalendar)}
        </label>
        <button class="button full" type="submit">${t(store.language, 'save')}</button>
      </form>
    </section>
    <section class="panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'families')}</h2>
        <button class="button secondary" id="settings-add-family">${ctx.icon('plus')}${t(store.language, 'addFamily')}</button>
      </div>
      <div class="list" id="settings-families-list">
        ${trip.families.map(renderSettingsFamily).join('')}
      </div>
    </section>
    <section class="panel">
      <h2>${t(store.language, 'settings')}</h2>
      <div class="form-grid">
        <label class="field">
          <span>${t(store.language, 'language')}</span>
          <select data-pref="language">
            <option value="fa" ${ctx.selected(store.language, 'fa')}>فارسی</option>
            <option value="en" ${ctx.selected(store.language, 'en')}>English</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'theme')}</span>
          <select data-pref="theme">
            <option value="light" ${ctx.selected(store.theme, 'light')}>${t(store.language, 'light')}</option>
            <option value="dark" ${ctx.selected(store.theme, 'dark')}>${t(store.language, 'dark')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'digits')}</span>
          <select data-pref="digits">
            <option value="latin" ${ctx.selected(store.digits, 'latin')}>${t(store.language, 'latin')}</option>
            <option value="persian" ${ctx.selected(store.digits, 'persian')}>${t(store.language, 'persian')}</option>
          </select>
        </label>
      </div>
      <div class="inline-actions" style="margin-block-start:var(--space-4)">
        <button class="button secondary" id="backup-trip">${ctx.icon('download')}${t(store.language, 'backupThisTrip')}</button>
        <label class="button secondary">
          ${ctx.icon('upload')}${t(store.language, 'restoreThisTrip')}
          <input id="restore-trip" type="file" accept="application/json" hidden>
        </label>
      </div>
      <p class="muted">${ctx.escapeHtml(trip.name)} · ${formatDate(trip.tripDate, trip.dateCalendar, store.language)} · ${t(store.language, trip.currency)}</p>
    </section>
  `;
}

function renderSettingsFamily(family) {
  return `
    <article class="card" data-family-id="${family.id}">
      <div class="family-row" style="margin-block-end:var(--space-3)">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <input class="family-name-input" value="${ctx.escapeAttr(family.name)}" style="flex:1;min-height:36px">
        <button class="icon-button" data-settings-del-family="${family.id}" aria-label="${t(store.language, 'confirmDelete')}">${ctx.icon('trash')}</button>
      </div>
      <div class="member-list" style="margin-block-end:var(--space-2)">
        ${family.members.map((member) => `
          <span class="chip" data-member-id="${member.id}">
            <span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(member.name)}</span>
            <input class="member-name-input" value="${ctx.escapeAttr(member.name)}" style="width:auto;min-width:60px;min-height:28px;padding:0 var(--space-1);border:none;background:transparent;color:inherit">
            <button class="icon-button" style="width:24px;height:24px;min-height:24px;border:none" data-settings-del-member="${member.id}" aria-label="${t(store.language, 'confirmDelete')}">${ctx.icon('trash')}</button>
          </span>
        `).join('')}
      </div>
      <div class="inline-actions" style="gap:var(--space-2)">
        <input class="new-member-input" placeholder="${t(store.language, 'memberName') || 'Name'}" style="flex:1;min-height:36px" data-family-ref="${family.id}">
        <button class="button secondary" data-settings-add-member="${family.id}" type="button">${ctx.icon('plus')}${t(store.language, 'addMember')}</button>
      </div>
    </article>
  `;
}

export function bindSettingsEvents() {
  const { app } = ctx;
  app.querySelector('#trip-name-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newName = data.get('tripName')?.trim();
    const rawDate = data.get('tripDate');
    const dateCalendar = data.get('dateCalendar');
    const tripDate = rawDate ? (parseDate(rawDate, dateCalendar) || rawDate) : null;
    updateTrip((trip) => {
      if (newName) trip.name = newName;
      trip.dateCalendar = dateCalendar || 'jalali';
      trip.currency = data.get('currency') || 'toman';
      trip.tripDate = tripDate;
    });
    ctx.showToast(t(store.language, 'saved'));
  });

  app.querySelector('#settings-add-family')?.addEventListener('click', () => {
    const color = nextFamilyColor(store.trip.families);
    const family = createFamily({ name: store.language === 'fa' ? 'خانواده جدید' : 'New family', colorHex: color });
    family.members = [createMember({ familyId: family.id, name: store.language === 'fa' ? 'نفر جدید' : 'New member' })];
    updateTrip((trip) => trip.families.push(family));
  });

  app.querySelectorAll('[data-settings-del-family]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const familyId = btn.dataset.settingsDelFamily;
      if (isFamilyReferenced(familyId)) {
        ctx.showToast(t(store.language, 'cantDeleteFamily'));
        return;
      }
      if (!confirm(t(store.language, 'confirmDelete'))) return;
      updateTrip((trip) => {
        trip.families = trip.families.filter((f) => f.id !== familyId);
      });
    });
  });

  app.querySelectorAll('[data-settings-add-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const familyId = btn.dataset.settingsAddMember;
      const input = app.querySelector(`[data-family-ref="${familyId}"]`);
      const name = input?.value?.trim();
      if (!name) return;
      updateTrip((trip) => {
        const family = trip.families.find((f) => f.id === familyId);
        if (family) family.members.push(createMember({ familyId, name }));
      });
      input.value = '';
    });
  });

  app.querySelectorAll('[data-settings-del-member]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const memberId = btn.dataset.settingsDelMember;
      if (isMemberReferenced(memberId)) {
        ctx.showToast(t(store.language, 'cantDeleteMember'));
        return;
      }
      if (!confirm(t(store.language, 'confirmDelete'))) return;
      updateTrip((trip) => {
        for (const family of trip.families) {
          family.members = family.members.filter((m) => m.id !== memberId);
        }
      });
    });
  });

  app.querySelectorAll('.family-name-input').forEach((input) => {
    input.addEventListener('change', () => {
      const card = input.closest('[data-family-id]');
      const familyId = card?.dataset.familyId;
      const name = input.value.trim();
      if (familyId && name) {
        updateTrip((trip) => {
          const family = trip.families.find((f) => f.id === familyId);
          if (family) family.name = name;
        });
      }
    });
  });

  app.querySelectorAll('.member-name-input').forEach((input) => {
    input.addEventListener('change', () => {
      const chip = input.closest('[data-member-id]');
      const memberId = chip?.dataset.memberId;
      const name = input.value.trim();
      if (memberId && name) {
        updateTrip((trip) => {
          for (const family of trip.families) {
            const member = family.members.find((m) => m.id === memberId);
            if (member) { member.name = name; break; }
          }
        });
      }
    });
  });

  app.querySelector('#backup-trip')?.addEventListener('click', exportTripBackup);
  app.querySelector('#restore-trip')?.addEventListener('change', restoreTripBackup);
}

function isFamilyReferenced(familyId) {
  if (!store.trip) return false;
  const memberIds = store.trip.families.find((f) => f.id === familyId)?.members.map((m) => m.id) || [];
  return store.trip.expenses.some((exp) =>
    exp.participantMemberIds?.some((pid) => memberIds.includes(pid)) ||
    exp.charges?.some((c) => memberIds.includes(c.payerMemberId))
  );
}

function isMemberReferenced(memberId) {
  if (!store.trip) return false;
  return store.trip.expenses.some((exp) =>
    exp.participantMemberIds?.includes(memberId) ||
    exp.charges?.some((c) => c.payerMemberId === memberId)
  );
}

function exportTripBackup() {
  const blob = new Blob([JSON.stringify(store.trip, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${store.trip.name || 'dong-trip'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function restoreTripBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    const trip = sanitizeTrip(JSON.parse(text));
    if (!trip) {
      ctx.showToast(store.language === 'fa' ? 'فایل معتبر نیست.' : 'Invalid file.');
      return;
    }
    importTrip(trip);
    ctx.showToast(store.language === 'fa' ? 'سفر بازیابی شد.' : 'Trip restored.');
  }).catch(() => ctx.showToast(store.language === 'fa' ? 'فایل معتبر نیست.' : 'Invalid file.'));
  event.target.value = '';
}
