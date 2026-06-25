import { store, initStore, subscribe, setPreference, setTrip, setView, updateTrip, importTrip, closeTrip, openTrip, deleteStoredTrip, getTripPreview } from './state/store.js';
import { saveTrip, loadTripIndex } from './storage/localStorageAdapter.js';
import { createCharge, createExpense, createFamily, createMember, createTrip, nextFamilyColor } from './state/schema.js';
import { formatMoney, parseAmountInput, toMinorUnit, formatInputValue } from './utils/currency.js';
import { formatDate, parseDate, dateInputValue } from './utils/date.js';
import { calculateExpenseTotal, calculateSettlement, calculatePerFamilyPaid, calculatePerPersonPaid, recalculateShares } from './utils/settlementEngine.js';
import { t, directionFor } from './utils/i18n.js';
import { validateTrip, isExpenseValid } from './utils/validators.js';

const app = document.querySelector('#app');
const iconTemplate = document.querySelector('#icon-sprite');
document.body.append(iconTemplate.content.cloneNode(true));

const state = {
  tripDraft: { tripName: '', dateCalendar: 'jalali', tripDate: '', currency: 'toman' },
  familyDraft: [{ name: '', members: [] }],
  expenseDraft: { title: '', icon: 'food', date: '', taxType: '', taxValue: '0', participants: [], shareWeights: null, lockedParticipants: [], participantShares: {}, notes: '' },
  chargeDraft: [{ amount: '', payerMemberId: '', note: '' }],
  expenseFilter: { search: '', category: '' },
  editingExpenseId: null,
  showArchived: false,
  lastError: ''
};

initStore();
subscribe(render);
render();
registerServiceWorker();

function render() {
  document.documentElement.lang = store.language;
  document.documentElement.dir = directionFor(store.language);
  document.body.dir = directionFor(store.language);
  document.documentElement.dataset.theme = store.theme;

  app.innerHTML = `
    ${renderHeader()}
    ${store.trip ? renderTabs() : ''}
    <main>
      ${store.trip ? renderCurrentView() : (store.view === 'newTrip' ? renderTripSetup() : renderTripList())}
    </main>
    <div id="toast" class="toast" hidden></div>
  `;

  bindGlobalEvents();
  if (store.trip) {
    bindAppEvents();
  } else if (store.view === 'newTrip') {
    bindTripSetupEvents();
  } else {
    bindTripListEvents();
  }
  initJalaliPicker();
}

function renderHeader() {
  const showBack = store.trip && !store.view.startsWith('trip');
  return `
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">${icon('route')}</div>
        <div>
          <h1>${t(store.language, 'appName')}</h1>
          <p>${store.trip ? escapeHtml(store.trip.name) : t(store.language, 'subtitle')}</p>
        </div>
      </div>
      ${showBack ? `<button class="icon-button" data-action="close-trip" aria-label="${t(store.language, 'backToTrips')}">${icon('arrow-left')}</button>` : ''}
    </header>
  `;
}

function renderTabs() {
  const tabs = ['dashboard', 'expenses', 'settlement', 'settings'];
  return `
    <nav class="nav-tabs bottom-nav" aria-label="${t(store.language, 'settings')}">
      ${tabs.map((tab) => `
        <button class="tab-button" data-view="${tab}" aria-selected="${store.view === tab}">
          ${icon(tab)}
          <span>${t(store.language, tab)}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

function renderCurrentView() {
  if (store.view === 'expenses') return renderExpensesView();
  if (store.view === 'settlement') return renderSettlementView();
  if (store.view === 'settings') return renderSettingsView();
  return renderDashboard();
}

function renderTripSetup() {
  const draft = state.familyDraft;
  return `
    <section class="panel">
      <h2>${t(store.language, 'newTrip')}</h2>
      <p class="muted">${t(store.language, 'noTrip')}</p>
      ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
      <form id="trip-form" class="form-grid">
        <label class="field">
          <span>${t(store.language, 'tripName')}</span>
          <input name="tripName" required value="${escapeAttr(state.tripDraft.tripName)}">
        </label>
        <label class="field">
          <span>${t(store.language, 'calendar')}</span>
          <select name="dateCalendar">
            <option value="jalali" ${selected(state.tripDraft.dateCalendar, 'jalali')}>${t(store.language, 'jalali')}</option>
            <option value="gregorian" ${selected(state.tripDraft.dateCalendar, 'gregorian')}>${t(store.language, 'gregorian')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'tripDate')}</span>
          ${dateInputHtml('tripDate', state.tripDraft.tripDate, state.tripDraft.dateCalendar)}
        </label>
        <label class="field">
          <span>${t(store.language, 'currency')}</span>
          <select name="currency" required>
            <option value="toman" ${selected(state.tripDraft.currency, 'toman')}>${t(store.language, 'toman')}</option>
            <option value="usd" ${selected(state.tripDraft.currency, 'usd')}>${t(store.language, 'usd')}</option>
            <option value="eur" ${selected(state.tripDraft.currency, 'eur')}>${t(store.language, 'eur')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'language')}</span>
          <select data-pref="language">
            <option value="fa" ${selected(store.language, 'fa')}>فارسی</option>
            <option value="en" ${selected(store.language, 'en')}>English</option>
          </select>
        </label>
        <div class="full">
          <div class="inline-actions">
            <h3>${t(store.language, 'families')}</h3>
            <button class="button secondary" type="button" id="add-family-row">${icon('plus')}${t(store.language, 'addFamily')}</button>
          </div>
          <div class="list">
            ${draft.map((family, index) => renderFamilyDraftRow(family, index)).join('')}
          </div>
        </div>
        <button class="button full" type="submit">${icon('wallet')}${t(store.language, 'createTrip')}</button>
      </form>
    </section>
  `;
}

function renderFamilyDraftRow(family, index) {
  return `
    <div class="card form-grid" data-family-row="${index}">
      <label class="field">
        <span>${t(store.language, 'familyName')}</span>
        <input name="familyName" value="${escapeAttr(family.name)}" placeholder="${store.language === 'fa' ? 'خانواده احمدی' : 'Ahmadi family'}">
      </label>
      <div class="field" style="grid-column:1/-1">
        <span>${t(store.language, 'memberNames')}</span>
        <div class="member-list" style="margin-block-end:var(--space-2)">
          ${family.members.map((name, mIdx) => `
            <span class="chip" data-draft-member="${index}:${mIdx}">
              <span class="avatar" style="--chip-color:#888">${initial(name)}</span>
              <input class="draft-member-name" value="${escapeAttr(name)}" data-family-index="${index}" data-member-index="${mIdx}" style="width:auto;min-width:60px;border:none;background:transparent;color:inherit">
              <button class="icon-button" style="width:24px;height:24px;min-height:24px;border:none" type="button" data-remove-draft-member="${index}:${mIdx}" aria-label="${t(store.language, 'confirmDelete')}">${icon('trash')}</button>
            </span>
          `).join('')}
        </div>
        <div class="inline-actions" style="gap:var(--space-2)">
          <input class="new-draft-member" placeholder="${t(store.language, 'memberName') || 'Name'}" style="flex:1;min-height:36px" data-family-index="${index}">
          <button class="button secondary" type="button" data-add-draft-member="${index}">${icon('plus')}${t(store.language, 'addMember')}</button>
        </div>
      </div>
      ${index > 0 ? `<button class="icon-button" type="button" data-remove-family="${index}" aria-label="Remove">${icon('trash')}</button>` : ''}
    </div>
  `;
}

function renderTripList() {
  const index = store.tripIndex;
  const showArchived = state.showArchived || false;
  const filtered = showArchived ? index : index.filter((e) => !e.archived);
  return `
    <section class="panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'myTrips')}</h2>
        <button class="button secondary" data-action="new-trip">${icon('plus')}${t(store.language, 'newTripShort')}</button>
      </div>
      ${store.tripIndex.some((e) => e.archived) ? `
        <label style="display:flex;align-items:center;gap:var(--space-2);font-size:0.85em;margin-block-end:var(--space-2);cursor:pointer">
          <input type="checkbox" id="show-archived" ${showArchived ? 'checked' : ''} style="width:16px;min-height:16px">
          ${t(store.language, 'archived')}
        </label>
      ` : ''}
      ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
      ${filtered.length ? `
        <div class="trip-card-grid">
          ${filtered.map((entry) => {
            const trip = loadTripData(entry.id);
            if (!trip) return '';
            const familyCount = trip.families.length;
            const memberCount = trip.families.reduce((s, f) => s + f.members.length, 0);
            const expenseCount = trip.expenses.length;
            return `
              <article class="card trip-card ${entry.archived ? 'archived' : ''}" data-trip-id="${entry.id}">
                <div class="inline-actions" style="margin-block-end:var(--space-2)">
                  <h3>${escapeHtml(entry.name)}${entry.archived ? ` <span class="chip" style="font-size:0.7rem;opacity:0.7">${t(store.language, 'archived')}</span>` : ''}</h3>
                  <div style="display:flex;gap:var(--space-1)">
                    <button class="icon-button" data-archive-trip="${entry.id}" aria-label="${entry.archived ? t(store.language, 'unarchive') : t(store.language, 'archiveTrip')}" title="${entry.archived ? t(store.language, 'unarchive') : t(store.language, 'archiveTrip')}">${icon('archive')}</button>
                    <button class="icon-button" data-delete-trip="${entry.id}" aria-label="${t(store.language, 'deleteTrip')}" title="${t(store.language, 'deleteTrip')}">${icon('trash')}</button>
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
                  <button class="button primary" data-open-trip="${entry.id}" style="flex:1">${icon('route')}${t(store.language, 'goToTrip')}</button>
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

function renderDashboard() {
  const trip = store.trip;
  const total = trip.expenses.reduce((sum, expense) => sum + (isExpenseValid(expense) ? calculateExpenseTotal(expense).expenseTotal : 0), 0);
  const familyStats = calculatePerFamilyPaid(trip);
  const topPayers = calculatePerPersonPaid(trip).slice(0, 5);
  return `
    <section class="summary-grid">
      <div class="stat"><span>${t(store.language, 'totalSpend')}</span><strong>${money(total)}</strong></div>
      <div class="stat"><span>${t(store.language, 'familyCount')}</span><strong>${trip.families.length}</strong></div>
      <div class="stat"><span>${t(store.language, 'expenseCount')}</span><strong>${trip.expenses.length}</strong></div>
    </section>
    <section class="panel">
      <h2>${t(store.language, 'familyCount')}</h2>
      <div class="bar-chart">
        ${familyStats.map((stat) => `
          <div class="bar-row">
            <span class="avatar" style="--chip-color:${stat.colorHex}">${initial(stat.familyName)}</span>
            <span class="bar-label">${escapeHtml(stat.familyName)}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${stat.pct}%;background:${stat.colorHex}"></span></span>
            <span class="bar-value">${money(stat.paid)}</span>
          </div>
        `).join('')}
      </div>
    </section>
    <section class="panel">
      <h2>${t(store.language, 'totalByCategory')}</h2>
      <div class="bar-chart">
        ${(() => {
          const cats = {};
          const validExpenses = trip.expenses.filter((e) => isExpenseValid(e));
          for (const e of validExpenses) {
            const t = calculateExpenseTotal(e);
            cats[e.icon || 'other'] = (cats[e.icon || 'other'] || 0) + t.expenseTotal;
          }
          const max = Math.max(...Object.values(cats), 1);
          return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([catKey, amount]) => `
            <div class="bar-row">
              <span class="brand-mark" style="width:32px;height:32px;border-radius:8px">${icon(catKey)}</span>
              <span class="bar-label">${t(store.language, 'category' + catKey.charAt(0).toUpperCase() + catKey.slice(1)) || catKey}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${(amount / max * 100).toFixed(1)}%;background:var(--color-primary)"></span></span>
              <span class="bar-value">${money(amount)}</span>
            </div>
          `).join('');
        })()}
      </div>
    </section>
    <section class="grid">
      <section class="panel">
        <h2>${escapeHtml(trip.name)}</h2>
        <p class="muted">${t(store.language, 'calendar')}: ${t(store.language, trip.dateCalendar)} · ${t(store.language, 'currency')}: ${t(store.language, trip.currency)} · ${formatDate(trip.tripDate, trip.dateCalendar, store.language)}</p>
        <div class="list">${trip.families.map(renderFamilyCard).join('')}</div>
      </section>
      <section class="panel">
        <div class="inline-actions">
          <h2>${t(store.language, 'expenses')}</h2>
          <button class="button secondary" data-view="expenses">${icon('plus')}${t(store.language, 'addExpense')}</button>
        </div>
        ${topPayers.length ? `
          <h3>${store.language === 'fa' ? 'پرداخت‌کنندگان برتر' : 'Top payers'}</h3>
          <div class="bar-chart" style="margin-block-end:var(--space-4)">
            ${topPayers.map((stat) => {
              const family = trip.families.find((f) => f.id === stat.familyId);
              return `
                <div class="bar-row">
                  <span class="avatar" style="--chip-color:${family?.colorHex || '#888'}">${initial(stat.memberName)}</span>
                  <span class="bar-label">${escapeHtml(stat.memberName)}</span>
                  <span class="bar-track"><span class="bar-fill" style="width:${stat.pct}%;background:var(--color-primary)"></span></span>
                  <span class="bar-value">${money(stat.paid)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        ${trip.expenses.length ? `<div class="list">${trip.expenses.slice(0, 5).map(renderExpenseCard).join('')}</div>` : renderEmpty('noExpenses')}
      </section>
    </section>
  `;
}

function renderFamilyCard(family) {
  return `
    <article class="card">
      <div class="family-row">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <h3>${escapeHtml(family.name)}</h3>
      </div>
      <div class="member-list">
        ${family.members.map((member) => `<span class="chip"><span class="avatar" style="--chip-color:${family.colorHex}">${initial(member.name)}</span>${escapeHtml(member.name)}</span>`).join('')}
      </div>
    </article>
  `;
}

function renderExpensesView() {
  return `
    <div class="grid">
      <section class="panel">
        <h2>${state.editingExpenseId ? t(store.language, 'editExpense') : t(store.language, 'addExpense')}</h2>
        ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
        <form id="expense-form" class="form-grid">
          <label class="field">
            <span>${t(store.language, 'expenseTitle')}</span>
            <input name="title" required value="${escapeAttr(state.expenseDraft.title)}">
          </label>
          <label class="field">
            <span>${t(store.language, 'category')}</span>
            <select name="icon">
              <option value="food" ${selected(state.expenseDraft.icon, 'food')}>${t(store.language, 'categoryFood')}</option>
              <option value="lodging" ${selected(state.expenseDraft.icon, 'lodging')}>${t(store.language, 'categoryLodging')}</option>
              <option value="car" ${selected(state.expenseDraft.icon, 'car')}>${t(store.language, 'categoryCar')}</option>
              <option value="fuel" ${selected(state.expenseDraft.icon, 'fuel')}>${t(store.language, 'categoryFuel')}</option>
              <option value="ticket" ${selected(state.expenseDraft.icon, 'ticket')}>${t(store.language, 'categoryTicket')}</option>
              <option value="bag" ${selected(state.expenseDraft.icon, 'bag')}>${t(store.language, 'categoryBag')}</option>
              <option value="other" ${selected(state.expenseDraft.icon, 'other')}>${t(store.language, 'categoryOther')}</option>
            </select>
          </label>
          <label class="field">
            <span>${t(store.language, 'expenseDate')}</span>
            ${dateInputHtml('date', state.expenseDraft.date, store.trip?.dateCalendar || 'jalali')}
          </label>
          <label class="field">
            <span>${t(store.language, 'taxType')}</span>
            <select name="taxType">
              <option value="" ${selected(state.expenseDraft.taxType, '')}>${t(store.language, 'noTax')}</option>
              <option value="percent" ${selected(state.expenseDraft.taxType, 'percent')}>${t(store.language, 'percent')}</option>
              <option value="fixed" ${selected(state.expenseDraft.taxType, 'fixed')}>${t(store.language, 'fixed')}</option>
            </select>
          </label>
          <label class="field" id="tax-value-field" ${state.expenseDraft.taxType ? '' : 'hidden'}>
            <span>${t(store.language, 'taxValue')}</span>
            <input name="taxValue" inputmode="decimal" value="${escapeAttr(state.expenseDraft.taxValue)}">
          </label>
            <div class="field full">
              <div class="inline-actions">
                <span class="label">${t(store.language, 'participants')}</span>
                <label class="chip" style="gap:var(--space-1);font-size:0.78rem;cursor:pointer;min-height:auto;padding:2px var(--space-2)">
                  <input type="checkbox" id="toggle-weights" ${state.expenseDraft.shareWeights ? 'checked' : ''} style="width:14px;min-height:14px;margin:0">
                  ${store.language === 'fa' ? 'سهم متفاوت' : 'Unequal'}
                </label>
              </div>
              <label class="participant-select-all">
                <input type="checkbox" id="participant-select-all">
                <span>${t(store.language, 'selectAll')}</span>
              </label>
              ${store.trip.families.map(renderFamilyParticipantGroup).join('')}
              ${state.expenseDraft.shareWeights ? renderParticipantSharesPreview() : ''}
            </div>
            <div class="field full">
            <div class="inline-actions">
              <span class="label">${t(store.language, 'payer')}</span>
              <button class="button secondary" id="add-charge-row" type="button">${icon('plus')}${t(store.language, 'payer')}</button>
            </div>
            <div class="list">${state.chargeDraft.map(renderChargeDraftRow).join('')}</div>
          </div>
          <label class="field full">
            <span>${t(store.language, 'notes')}</span>
            <textarea name="notes">${escapeHtml(state.expenseDraft.notes)}</textarea>
          </label>
          <button class="button full" type="submit">${icon('wallet')}${state.editingExpenseId ? t(store.language, 'saveExpense') : t(store.language, 'addExpense')}</button>
          <button class="button secondary full" type="button" id="cancel-edit-expense" style="margin-block-start:var(--space-2)">${t(store.language, 'cancel')}</button>
        </form>
      </section>
      <section class="panel">
        <h2>${t(store.language, 'expenses')}</h2>
        <div class="form-grid" style="margin-block-end:var(--space-4)">
          <label class="field">
            <span>${store.language === 'fa' ? 'جستجو' : 'Search'}</span>
            <input id="expense-search" value="${escapeAttr(state.expenseFilter.search)}" placeholder="${t(store.language, 'expenseTitle')}...">
          </label>
          <label class="field">
            <span>${t(store.language, 'category')}</span>
            <select id="expense-category-filter">
              <option value="" ${selected(state.expenseFilter.category, '')}>${store.language === 'fa' ? 'همه' : 'All'}</option>
              <option value="food" ${selected(state.expenseFilter.category, 'food')}>${t(store.language, 'categoryFood')}</option>
              <option value="lodging" ${selected(state.expenseFilter.category, 'lodging')}>${t(store.language, 'categoryLodging')}</option>
              <option value="car" ${selected(state.expenseFilter.category, 'car')}>${t(store.language, 'categoryCar')}</option>
              <option value="fuel" ${selected(state.expenseFilter.category, 'fuel')}>${t(store.language, 'categoryFuel')}</option>
              <option value="ticket" ${selected(state.expenseFilter.category, 'ticket')}>${t(store.language, 'categoryTicket')}</option>
              <option value="bag" ${selected(state.expenseFilter.category, 'bag')}>${t(store.language, 'categoryBag')}</option>
              <option value="other" ${selected(state.expenseFilter.category, 'other')}>${t(store.language, 'categoryOther')}</option>
            </select>
          </label>
        </div>
        <div id="expenses-list">${renderFilteredExpenses()}</div>
      </section>
    </div>
  `;
}

function renderFilteredExpenses() {
  const { search, category } = state.expenseFilter;
  const filtered = store.trip.expenses.filter((expense) => {
    if (search && !expense.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && expense.icon !== category) return false;
    return true;
  });
  return filtered.length
    ? `<div class="list">${filtered.map(renderExpenseCard).join('')}</div>`
    : renderEmpty('noExpenses');
}

function renderParticipantCheck(member) {
  const family = familyForMember(member.id);
  const isSelected = state.expenseDraft.participants.includes(member.id);
  const hasUnequal = !!state.expenseDraft.shareWeights;
  const isLocked = state.expenseDraft.lockedParticipants?.includes(member.id);
  const share = state.expenseDraft.participantShares?.[member.id];

  if (!hasUnequal) {
    return `
      <label class="check-row">
        <input type="checkbox" name="participants" value="${member.id}" ${isSelected ? 'checked' : ''}>
        <span class="avatar" style="--chip-color:${family.colorHex}">${initial(member.name)}</span>
        <span>${escapeHtml(member.name)}</span>
      </label>
    `;
  }

  const formattedShare = share != null ? money(share) : '';
  const displayShare = share != null ? formatInputValue(String(share)) : '';
  return `
    <div class="check-row" data-participant-row="${member.id}" style="min-height:32px;padding:var(--space-1) var(--space-2);display:grid;grid-template-columns:auto minmax(120px,1fr) auto auto;gap:var(--space-2);align-items:center">
      <label style="display:flex;align-items:center;gap:var(--space-2);min-width:0;cursor:pointer">
        <input type="checkbox" name="participants" value="${member.id}" ${isSelected ? 'checked' : ''}>
        <span class="avatar" style="--chip-color:${family.colorHex}">${initial(member.name)}</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(member.name)}</span>
      </label>
      <div style="display:flex;gap:var(--space-1);align-items:center;width:100%">
        <input name="share_${member.id}" type="text" inputmode="decimal" value="${escapeAttr(displayShare)}" class="share-input" data-share-member="${member.id}" placeholder="${store.language === 'fa' ? 'سهم' : 'Share'}" ${isSelected ? '' : 'disabled'} style="flex:1;min-width:0;width:auto">
        <span class="currency-badge" ${isSelected ? '' : 'hidden'}>${currencyLabel()}</span>
      </div>
      <button type="button" class="lock-btn ${isLocked ? 'locked' : ''}" data-lock="${member.id}" aria-label="${isLocked ? (store.language === 'fa' ? 'باز کردن قفل' : 'Unlock') : (store.language === 'fa' ? 'قفل کردن' : 'Lock')}" ${isSelected ? '' : 'hidden'}>${isLocked ? '🔒' : '🔓'}</button>
      <span ${isSelected && formattedShare ? '' : 'hidden'} style="font-size:0.78rem;color:var(--color-muted);white-space:nowrap;text-align:right;direction:ltr">${formattedShare}</span>
    </div>
  `;
}

function renderFamilyParticipantGroup(family) {
  const hasUnequal = !!state.expenseDraft.shareWeights;
  return `
    <div class="family-group" data-family-group="${family.id}">
      <div class="family-group-header">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <span class="family-name">${escapeHtml(family.name)}</span>
        <label>
          <input type="checkbox" data-family-select-all="${family.id}">
          <span>${t(store.language, 'selectAll')}</span>
        </label>
      </div>
      <div class="family-group-body">
        ${family.members.map(renderParticipantCheck).join('')}
      </div>
    </div>
  `;
}

function renderChargeDraftRow(charge, index) {
  return `
    <div class="card form-grid" data-charge-row="${index}">
      <label class="field">
        <span>${t(store.language, 'payer')}</span>
        <select name="payerMemberId" required>
          <option value="">---</option>
          ${allMembers().map((member) => `<option value="${member.id}" ${selected(charge.payerMemberId, member.id)}>${escapeHtml(member.name)} · ${escapeHtml(familyForMember(member.id).name)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span>${t(store.language, 'amount')}</span>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input name="chargeAmount" inputmode="decimal" value="${escapeAttr(formatInputValue(charge.amount))}" required class="charge-amount-input" style="flex:1">
          <span class="currency-badge">${currencyLabel()}</span>
        </div>
      </label>
      <label class="field full">
        <span>${t(store.language, 'notes')}</span>
        <input name="chargeNote" value="${escapeAttr(charge.note || '')}">
      </label>
      ${index > 0 ? `<button class="icon-button" type="button" data-remove-charge="${index}" aria-label="Remove">${icon('trash')}</button>` : ''}
    </div>
  `;
}

function currencyLabel() {
  const trip = store.trip;
  if (!trip) return '';
  const meta = { toman: 'تومان', usd: '$', eur: '€' };
  return meta[trip.currency] || trip.currency;
}

function updateSelectAllStates() {
  if (!store.trip) return;
  for (const family of store.trip.families) {
    const ids = family.members.map((m) => m.id);
    const all = ids.every((id) => app.querySelector(`[name="participants"][value="${id}"]`)?.checked);
    const famCb = app.querySelector(`[data-family-select-all="${family.id}"]`);
    if (famCb) famCb.checked = all;
  }
  updateGlobalSelectAllState();
}

function updateGlobalSelectAllState() {
  const all = app.querySelectorAll('[name="participants"]');
  const checked = app.querySelectorAll('[name="participants"]:checked');
  const globalCb = app.querySelector('#participant-select-all');
  if (globalCb) globalCb.checked = all.length > 0 && all.length === checked.length;
}

function renderParticipantSharesPreview() {
  const draft = state.expenseDraft;
  const chargeTotal = getChargeTotal();
  const locked = draft.lockedParticipants || [];
  const shares = draft.participantShares || {};
  const lockedTotal = locked.reduce((sum, id) => sum + Math.round(shares[id] || 0), 0);
  const remaining = Math.max(0, chargeTotal - lockedTotal);
  const unlockedCount = draft.participants.length - locked.length;
  const unlockedShare = unlockedCount > 0 ? Math.trunc(remaining / unlockedCount) : 0;
  const anyLocked = locked.length > 0;

  return `
    <div class="share-preview">
      <div class="share-preview-row">
        <span class="share-preview-label">${store.language === 'fa' ? 'جمع هزینه' : 'Total'}</span>
        <span class="share-preview-value">${money(chargeTotal)}</span>
      </div>
      ${anyLocked ? `
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'قفل شده' : 'Locked'}</span>
          <span class="share-preview-value">${money(lockedTotal)}</span>
        </div>
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'باقی‌مانده' : 'Remaining'}</span>
          <span class="share-preview-value">${money(remaining)}</span>
        </div>
        <div class="share-preview-row" style="border-top:1px solid var(--color-border);padding-top:var(--space-2);margin-top:var(--space-2)">
          <span class="share-preview-label">${store.language === 'fa' ? 'سهم هر نفر (باز)' : 'Per unlocked'}</span>
          <span class="share-preview-value">${unlockedCount > 0 ? money(unlockedShare) : '—'}</span>
        </div>
      ` : `
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'سهم هر نفر' : 'Per person'}</span>
          <span class="share-preview-value">${unlockedCount > 0 ? money(unlockedShare) : '—'}</span>
        </div>
      `}
      <div class="share-preview-row" style="font-size:0.78rem;color:var(--color-muted);margin-top:var(--space-1)">
        <span>${draft.participants.length} ${store.language === 'fa' ? 'نفر' : 'participant(s)'}</span>
        <span>${anyLocked ? `${locked.length} ${store.language === 'fa' ? 'نفر قفل' : 'locked'}` : store.language === 'fa' ? 'همگی باز' : 'all unlocked'}</span>
      </div>
    </div>
  `;
}

function renderExpenseCard(expense) {
  const { expenseTotal, taxAmount } = calculateExpenseTotal(expense);
  const valid = isExpenseValid(expense);
  const payerIds = [...new Set(expense.charges.map((c) => c.payerMemberId).filter(Boolean))];
  const payers = payerIds.map((id) => memberById(id)).filter(Boolean);
  return `
    <article class="card">
      <div class="expense-row">
        <span class="brand-mark" style="width:40px;height:40px;border-radius:12px">${icon(expense.icon || 'wallet')}</span>
        <div style="min-width:0; flex:1">
          <h3>${escapeHtml(expense.title)}</h3>
          <p class="muted">${formatDate(expense.date, store.trip.dateCalendar, store.language)} · ${money(expenseTotal)}${expense.tax?.type && expense.tax.type !== 'none' ? ` · ${t(store.language, 'taxValue')}: ${money(taxAmount)}` : ''}</p>
          ${payers.length ? `<p class="muted" style="font-size:0.82em;margin-block-start:var(--space-1)"><span style="opacity:0.6">${t(store.language, 'paidBy')}:</span> ${payers.map((m) => {
            const f = familyForMember(m.id);
            return `<span class="chip" style="font-size:0.78rem;padding:1px var(--space-2)"><span class="avatar" style="--chip-color:${f.colorHex};width:16px;height:16px;font-size:0.6rem">${initial(m.name)}</span>${escapeHtml(m.name)}</span>`;
          }).join(' ')}</p>` : ''}
        </div>
        <button class="icon-button" data-edit-expense="${expense.id}" aria-label="${t(store.language, 'editExpense')}" title="${t(store.language, 'editExpense')}">${icon('edit')}</button>
        <button class="icon-button" data-delete-expense="${expense.id}" aria-label="Delete">${icon('trash')}</button>
      </div>
      <div class="chips" style="margin-block-end:var(--space-2)">${expense.participantMemberIds.map((id) => memberById(id)).filter(Boolean).map((member) => {
        const family = familyForMember(member.id);
        return `<span class="chip"><span class="avatar" style="--chip-color:${family.colorHex}">${initial(member.name)}</span>${escapeHtml(member.name)}</span>`;
      }).join('')}</div>
      ${expense.notes ? `<p class="muted" style="font-size:0.85em;margin-block-end:var(--space-1)"><span style="opacity:0.6">${t(store.language, 'expenseNote')}:</span> ${escapeHtml(expense.notes)}</p>` : ''}
      ${valid ? '' : `<p class="error">${t(store.language, 'invalidExpense')}</p>`}
    </article>
  `;
}

function renderSettlementView() {
  const result = calculateSettlement(store.trip);
  const familyById = new Map(store.trip.families.map((family) => [family.id, family]));
  const settled = new Set(store.trip.settledTransfers || []);
  return `
    <section class="panel" id="settlement-panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'settlement')}</h2>
        <button class="button secondary" id="print-settlement" type="button">${icon('print')}${t(store.language, 'printSettlement')}</button>
      </div>
      ${result.transfers.length ? `
        <div class="list">
          ${result.transfers.map((transfer) => {
            const from = familyById.get(transfer.from);
            const to = familyById.get(transfer.to);
            const key = `${transfer.from}_${transfer.to}_${transfer.amount}`;
            const arrow = store.language === 'fa' ? '←' : '→';
            return `
              <label class="card settlement-row" data-settle-key="${key}">
                <input type="checkbox" class="settle-checkbox" data-settle-key="${key}" ${settled.has(key) ? 'checked' : ''} style="width:18px;min-height:18px">
                <span class="avatar" style="--chip-color:${from.colorHex}">${initial(from.name)}</span>
                <strong>${escapeHtml(from.name)}</strong>
                <span class="muted">${arrow}</span>
                <span class="avatar" style="--chip-color:${to.colorHex}">${initial(to.name)}</span>
                <strong>${escapeHtml(to.name)}</strong>
                <span>${money(transfer.amount)}</span>
              </label>
            `;
          }).join('')}
        </div>
        <p class="muted" style="margin-block-start:var(--space-3)">${store.language === 'fa' ? 'گزینه‌های تسویه شده را تیک بزنید.' : 'Check off settled transfers.'}</p>
      ` : renderEmpty('noSettlement')}
    </section>
    <section class="panel">
      <h3>${store.language === 'fa' ? 'مانده خانواده‌ها' : 'Family balances'}</h3>
      <div class="list">
        ${Object.entries(result.familyBalance).map(([familyId, balance]) => {
          const family = familyById.get(familyId);
          const members = store.trip.families.find((f) => f.id === familyId)?.members || [];
          const memberRows = members.map((m) => {
            const mb = result.memberBalance?.[m.id];
            if (mb == null) return '';
            return `<div class="family-row" style="padding:var(--space-1) var(--space-3);font-size:0.85em;opacity:0.8"><span class="avatar" style="--chip-color:${family.colorHex};width:24px;height:24px;font-size:0.7rem">${initial(m.name)}</span><span>${escapeHtml(m.name)}</span><span>${money(mb)}</span></div>`;
          }).join('');
          return `<div class="card"><div class="family-row"><span class="avatar" style="--chip-color:${family.colorHex}">${initial(family.name)}</span><strong>${escapeHtml(family.name)}</strong><span>${money(balance)}</span></div>${memberRows}</div>`;
        }).join('')}
      </div>
    </section>
  `;
}

function renderSettingsView() {
  const trip = store.trip;
  return `
    <section class="panel">
      <h2>${t(store.language, 'manageTrip')}</h2>
      <form id="trip-name-form" class="form-grid">
        <label class="field">
          <span>${t(store.language, 'tripName')}</span>
          <input name="tripName" value="${escapeAttr(trip.name)}">
        </label>
        <label class="field">
          <span>${t(store.language, 'calendar')}</span>
          <select name="dateCalendar">
            <option value="jalali" ${selected(trip.dateCalendar, 'jalali')}>${t(store.language, 'jalali')}</option>
            <option value="gregorian" ${selected(trip.dateCalendar, 'gregorian')}>${t(store.language, 'gregorian')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'currency')}</span>
          <select name="currency">
            <option value="toman" ${selected(trip.currency, 'toman')}>${t(store.language, 'toman')}</option>
            <option value="usd" ${selected(trip.currency, 'usd')}>${t(store.language, 'usd')}</option>
            <option value="eur" ${selected(trip.currency, 'eur')}>${t(store.language, 'eur')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'tripDate')}</span>
          ${dateInputHtml('tripDate', trip.tripDate, trip.dateCalendar)}
        </label>
        <button class="button full" type="submit">${t(store.language, 'save')}</button>
      </form>
    </section>
    <section class="panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'families')}</h2>
        <button class="button secondary" id="settings-add-family">${icon('plus')}${t(store.language, 'addFamily')}</button>
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
            <option value="fa" ${selected(store.language, 'fa')}>فارسی</option>
            <option value="en" ${selected(store.language, 'en')}>English</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'theme')}</span>
          <select data-pref="theme">
            <option value="light" ${selected(store.theme, 'light')}>${t(store.language, 'light')}</option>
            <option value="dark" ${selected(store.theme, 'dark')}>${t(store.language, 'dark')}</option>
          </select>
        </label>
        <label class="field">
          <span>${t(store.language, 'digits')}</span>
          <select data-pref="digits">
            <option value="latin" ${selected(store.digits, 'latin')}>${t(store.language, 'latin')}</option>
            <option value="persian" ${selected(store.digits, 'persian')}>${t(store.language, 'persian')}</option>
          </select>
        </label>
      </div>
      <div class="inline-actions" style="margin-block-start:var(--space-4)">
        <button class="button secondary" id="export-json">${t(store.language, 'exportJson')}</button>
        <label class="button secondary">
          ${t(store.language, 'importJson')}
          <input id="import-json" type="file" accept="application/json" hidden>
        </label>
      </div>
      <p class="muted">${escapeHtml(trip.name)} · ${formatDate(trip.tripDate, trip.dateCalendar, store.language)} · ${t(store.language, trip.currency)}</p>
    </section>
  `;
}

function renderSettingsFamily(family) {
  return `
    <article class="card" data-family-id="${family.id}">
      <div class="family-row" style="margin-block-end:var(--space-3)">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <input class="family-name-input" value="${escapeAttr(family.name)}" style="flex:1;min-height:36px">
        <button class="icon-button" data-settings-del-family="${family.id}" aria-label="${t(store.language, 'confirmDelete')}">${icon('trash')}</button>
      </div>
      <div class="member-list" style="margin-block-end:var(--space-2)">
        ${family.members.map((member) => `
          <span class="chip" data-member-id="${member.id}">
            <span class="avatar" style="--chip-color:${family.colorHex}">${initial(member.name)}</span>
            <input class="member-name-input" value="${escapeAttr(member.name)}" style="width:auto;min-width:60px;min-height:28px;padding:0 var(--space-1);border:none;background:transparent;color:inherit">
            <button class="icon-button" style="width:24px;height:24px;min-height:24px;border:none" data-settings-del-member="${member.id}" aria-label="${t(store.language, 'confirmDelete')}">${icon('trash')}</button>
          </span>
        `).join('')}
      </div>
      <div class="inline-actions" style="gap:var(--space-2)">
        <input class="new-member-input" placeholder="${t(store.language, 'memberName') || 'Name'}" style="flex:1;min-height:36px" data-family-ref="${family.id}">
        <button class="button secondary" data-settings-add-member="${family.id}" type="button">${icon('plus')}${t(store.language, 'addMember')}</button>
      </div>
    </article>
  `;
}

function bindGlobalEvents() {
  app.querySelectorAll('[data-pref]').forEach((select) => {
    select.addEventListener('change', () => setPreference(select.dataset.pref, select.value));
  });
  app.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  app.querySelector('[data-action="close-trip"]')?.addEventListener('click', () => {
    closeTrip();
  });
}

function bindTripSetupEvents() {
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

function bindTripListEvents() {
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
        showToast(t(store.language, 'tripDeleted'));
      }
    });
  });
  app.querySelectorAll('[data-archive-trip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.archiveTrip;
      const tripData = loadTripData(id);
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
}

function bindAppEvents() {
  app.querySelector('#expense-form')?.addEventListener('input', () => {
    syncExpenseDraft();
    syncChargeDraft();
  });
  app.querySelector('#add-charge-row')?.addEventListener('click', () => {
    syncExpenseDraft();
    syncChargeDraft();
    state.chargeDraft.push({ amount: '', payerMemberId: '', note: '' });
    render();
  });
  app.querySelectorAll('[data-remove-charge]').forEach((button) => {
    button.addEventListener('click', () => {
      syncExpenseDraft();
      syncChargeDraft();
      state.chargeDraft.splice(Number(button.dataset.removeCharge), 1);
      render();
    });
  });
  app.querySelector('#expense-form')?.addEventListener('submit', submitExpense);
  app.querySelectorAll('[data-delete-expense]').forEach((button) => {
    button.addEventListener('click', () => {
      updateTrip((trip) => {
        trip.expenses = trip.expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
      });
    });
  });
  app.querySelectorAll('[data-edit-expense]').forEach((button) => {
    button.addEventListener('click', () => {
      const expense = store.trip.expenses.find((e) => e.id === button.dataset.editExpense);
      if (!expense) return;
      state.editingExpenseId = expense.id;
      const taxType = expense.tax?.type || '';
      const taxValue = expense.tax ? String(expense.tax.type === 'fixed' ? expense.tax.value : expense.tax.value) : '0';
      state.expenseDraft = {
        title: expense.title,
        icon: expense.icon || 'food',
        date: expense.date || '',
        taxType,
        taxValue,
        participants: [...expense.participantMemberIds],
        shareWeights: expense.shareWeights ? { ...expense.shareWeights } : null,
        lockedParticipants: [],
        participantShares: {},
        notes: expense.notes || ''
      };
      state.chargeDraft = expense.charges.map((c) => ({
        amount: String(c.amount),
        payerMemberId: c.payerMemberId,
        note: c.note || ''
      }));
      state.expenseFilter.search = '';
      state.expenseFilter.category = '';
      setView('expenses');
    });
  });
  app.querySelector('#cancel-edit-expense')?.addEventListener('click', () => {
    state.editingExpenseId = null;
    state.expenseDraft = { title: '', icon: 'food', date: '', taxType: '', taxValue: '0', participants: [], shareWeights: null, lockedParticipants: [], participantShares: {}, notes: '' };
    state.chargeDraft = [{ amount: '', payerMemberId: '', note: '' }];
    render();
  });

  app.querySelector('[name="taxType"]')?.addEventListener('change', (e) => {
    const field = app.querySelector('#tax-value-field');
    if (field) field.hidden = !e.target.value;
  });

  app.querySelector('#expense-search')?.addEventListener('input', (e) => {
    state.expenseFilter.search = e.target.value;
    renderFilteredOnly();
  });
  app.querySelector('#expense-category-filter')?.addEventListener('change', (e) => {
    state.expenseFilter.category = e.target.value;
    renderFilteredOnly();
  });

  app.querySelector('#print-settlement')?.addEventListener('click', () => {
    const panel = app.querySelector('#settlement-panel');
    if (!panel) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const content = panel.querySelector('.list')?.innerHTML || '';
    const dir = directionFor(store.language);
    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}" lang="${store.language}">
      <head><meta charset="UTF-8"><title>${t(store.language, 'settlement')} - ${escapeHtml(store.trip.name)}</title>
      <style>
        body{font-family:sans-serif;padding:2em;max-width:700px;margin:0 auto;direction:${dir}}
        .settlement-row{display:flex;align-items:center;gap:0.75em;padding:0.75em;border:1px solid #ddd;border-radius:8px;margin-block-end:0.5em}
        .avatar{display:inline-flex;width:32px;height:32px;border-radius:50%;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:0.85rem}
        .muted{color:#666}
      </style>
      </head>
      <body>
        <h1>${escapeHtml(store.trip.name)} - ${t(store.language, 'settlement')}</h1>
        ${content}
        <p style="margin-block-start:2em;color:#999;font-size:0.85em">${t(store.language, 'appName')}</p>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  });
  app.querySelectorAll('.settle-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.settleKey;
      updateTrip((trip) => {
        if (!trip.settledTransfers) trip.settledTransfers = [];
        if (cb.checked) {
          if (!trip.settledTransfers.includes(key)) trip.settledTransfers.push(key);
        } else {
          trip.settledTransfers = trip.settledTransfers.filter((k) => k !== key);
        }
      });
    });
  });

  app.querySelector('#toggle-weights')?.addEventListener('change', (e) => {
    syncExpenseDraft();
    syncChargeDraft();
    if (e.target.checked) {
      const chargeTotal = getChargeTotal();
      const participants = allMembers().map((m) => m.id);
      state.expenseDraft.participants = participants;
      const shares = {};
      if (participants.length > 0 && chargeTotal > 0) {
        const base = Math.trunc(chargeTotal / participants.length);
        let rem = chargeTotal - base * participants.length;
        for (const pid of participants) {
          const extra = rem > 0 ? 1 : 0;
          rem -= extra;
          shares[pid] = base + extra;
        }
        const equalShare = chargeTotal > 0 ? chargeTotal / participants.length : 1;
        const weights = {};
        for (const pid of participants) {
          weights[pid] = Math.max(1, Math.round((shares[pid] || 0) / equalShare * 100));
        }
        state.expenseDraft.shareWeights = weights;
        state.expenseDraft.lockedParticipants = [];
        state.expenseDraft.participantShares = shares;
      } else {
        state.expenseDraft.shareWeights = {};
        state.expenseDraft.lockedParticipants = [];
        state.expenseDraft.participantShares = {};
      }
    } else {
      state.expenseDraft.shareWeights = null;
      state.expenseDraft.lockedParticipants = [];
      state.expenseDraft.participantShares = {};
    }
    render();
  });

  // Participant checkbox change — re-render to show/hide lock & share
  app.querySelectorAll('[name="participants"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      updateSelectAllStates();
      if (state.expenseDraft.shareWeights) {
        syncExpenseDraft();
        syncChargeDraft();
        render();
      }
    });
  });

  // Global select-all
  app.querySelector('#participant-select-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    app.querySelectorAll('[name="participants"]').forEach((cb) => { cb.checked = checked; });
    app.querySelectorAll('[data-family-select-all]').forEach((cb) => { cb.checked = checked; });
    if (state.expenseDraft.shareWeights) {
      syncExpenseDraft();
      syncChargeDraft();
      render();
    }
  });

  // Per-family select-all
  app.querySelectorAll('[data-family-select-all]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const familyId = e.target.dataset.familySelectAll;
      const checked = e.target.checked;
      const family = store.trip.families.find((f) => f.id === familyId);
      if (!family) return;
      const ids = family.members.map((m) => m.id);
      app.querySelectorAll('[name="participants"]').forEach((cb) => {
        if (ids.includes(cb.value)) cb.checked = checked;
      });
      updateGlobalSelectAllState();
      if (state.expenseDraft.shareWeights) {
        syncExpenseDraft();
        syncChargeDraft();
        render();
      }
    });
  });

  // Lock button handler
  app.querySelectorAll('[data-lock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const memberId = btn.dataset.lock;
      const wasLocked = btn.classList.contains('locked');
      syncExpenseDraft();
      syncChargeDraft();
      if (!wasLocked) {
        btn.classList.add('locked');
        const locked = state.expenseDraft.lockedParticipants || [];
        if (!locked.includes(memberId)) locked.push(memberId);
        state.expenseDraft.lockedParticipants = locked;
        // Lock current share value
        const chargeTotal = getChargeTotal();
        const participants = state.expenseDraft.participants;
        const shares = state.expenseDraft.participantShares || {};
        shares[memberId] = shares[memberId] || 0;
        const fixedAmounts = {};
        for (const lid of locked) {
          fixedAmounts[lid] = shares[lid] || 0;
        }
        const result = recalculateShares({
          participantIds: participants,
          lockedIds: locked,
          fixedAmounts,
          totalExpense: chargeTotal
        });
        for (const item of result) {
          shares[item.memberId] = item.amount;
        }
        state.expenseDraft.participantShares = shares;
      } else {
        btn.classList.remove('locked');
        const locked = (state.expenseDraft.lockedParticipants || []).filter((id) => id !== memberId);
        state.expenseDraft.lockedParticipants = locked;
        const chargeTotal = getChargeTotal();
        const participants = state.expenseDraft.participants;
        const shares = state.expenseDraft.participantShares || {};
        const fixedAmounts = {};
        for (const lid of locked) {
          fixedAmounts[lid] = shares[lid] || 0;
        }
        const result = recalculateShares({
          participantIds: participants,
          lockedIds: locked,
          fixedAmounts,
          totalExpense: chargeTotal
        });
        for (const item of result) {
          shares[item.memberId] = item.amount;
        }
        state.expenseDraft.participantShares = shares;
      }
      render();
    });
  });

  // Share input change — auto-lock and redistribute
  app.querySelectorAll('[data-share-member]').forEach((input) => {
    input.addEventListener('change', function () {
      const memberId = this.dataset.shareMember;
      syncExpenseDraft();
      syncChargeDraft();
      const chargeTotal = getChargeTotal();
      const participants = state.expenseDraft.participants || [];
      const shares = state.expenseDraft.participantShares || {};
      const locked = state.expenseDraft.lockedParticipants || [];
      const raw = this.value.replace(/,/g, '');
      const shareVal = parseAmountInput(raw, store.trip?.currency || 'toman');
      shares[memberId] = shareVal;
      // Auto-lock this member
      if (!locked.includes(memberId)) locked.push(memberId);
      const fixedAmounts = {};
      for (const lid of locked) {
        fixedAmounts[lid] = shares[lid] || 0;
      }
      const result = recalculateShares({
        participantIds: participants,
        lockedIds: locked,
        fixedAmounts,
        totalExpense: chargeTotal
      });
      for (const item of result) {
        shares[item.memberId] = item.amount;
      }
      state.expenseDraft.lockedParticipants = locked;
      state.expenseDraft.participantShares = shares;
      render();
    });
  });

  // Live comma formatting on charge amount inputs
  app.querySelectorAll('input[name="chargeAmount"]').forEach((input) => {
    input.addEventListener('input', function () {
      const formatted = formatInputValue(this.value);
      if (formatted !== this.value) {
        this.value = formatted;
      }
    });
  });

  app.querySelector('#expense-search')?.addEventListener('input', (e) => {
    state.expenseFilter.search = e.target.value;
    render();
  });
  app.querySelector('#expense-category-filter')?.addEventListener('change', (e) => {
    state.expenseFilter.category = e.target.value;
    render();
  });

  app.querySelector('#export-json')?.addEventListener('click', exportJson);
  app.querySelector('#import-json')?.addEventListener('change', importJson);

  bindSettingsEvents();
}

function bindSettingsEvents() {
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
    showToast(t(store.language, 'saved'));
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
        showToast(t(store.language, 'cantDeleteFamily'));
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
        showToast(t(store.language, 'cantDeleteMember'));
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

function submitExpense(event) {
  event.preventDefault();
  syncExpenseDraft();
  syncChargeDraft();
  const form = event.currentTarget;
  const data = new FormData(form);
  const taxType = data.get('taxType');
  const tax = taxType ? {
    type: taxType,
    value: taxType === 'fixed'
      ? parseAmountInput(data.get('taxValue'), store.trip.currency)
      : Number(data.get('taxValue') || 0)
  } : null;
  const charges = state.chargeDraft.map((charge) => createCharge({
    amount: parseAmountInput(charge.amount, store.trip.currency),
    payerMemberId: charge.payerMemberId,
    note: charge.note || ''
  }));
  const rawDate = data.get('date');
  const expenseDate = parseDate(rawDate, store.trip.dateCalendar) || rawDate || null;
  const expense = createExpense({
    title: data.get('title'),
    icon: data.get('icon'),
    date: expenseDate,
    participantMemberIds: data.getAll('participants'),
    tax,
    charges,
    notes: data.get('notes'),
    shareWeights: state.expenseDraft.shareWeights
  });
  if (!isExpenseValid(expense)) {
    state.lastError = t(store.language, 'invalidExpense');
    render();
    return;
  }
  state.lastError = '';
  state.expenseDraft = { title: '', icon: 'food', date: '', taxType: '', taxValue: '0', participants: [], shareWeights: null, lockedParticipants: [], participantShares: {}, notes: '' };
  state.chargeDraft = [{ amount: '', payerMemberId: '', note: '' }];
  if (state.editingExpenseId) {
    updateTrip((trip) => {
      const idx = trip.expenses.findIndex((e) => e.id === state.editingExpenseId);
      if (idx !== -1) {
        expense.id = state.editingExpenseId;
        expense.createdAt = trip.expenses[idx].createdAt;
        trip.expenses[idx] = expense;
      }
    });
    state.editingExpenseId = null;
  } else {
    updateTrip((trip) => trip.expenses.unshift(expense));
  }
  scheduleScroll('#expenses-list');
}

function syncTripDraft() {
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
  state.familyDraft = [...app.querySelectorAll('[data-family-row]')].map((row) => ({
    name: row.querySelector('[name="familyName"]').value,
    members: [...row.querySelectorAll('.draft-member-name')].map((input) => input.value)
  }));
}

function syncExpenseDraft() {
  const form = app.querySelector('#expense-form');
  if (!form) return;
  const data = new FormData(form);
  const participants = data.getAll('participants');
  const toggle = form.querySelector('#toggle-weights');
  let shareWeights = state.expenseDraft.shareWeights;
  let lockedParticipants = state.expenseDraft.lockedParticipants || [];
  let participantShares = state.expenseDraft.participantShares || {};

  if (toggle?.checked) {
    // Read share values from inputs and lock state from DOM
    const newShares = {};
    const newLocked = [];
    for (const pid of participants) {
      const rawShare = data.get(`share_${pid}`);
      if (rawShare) {
        const val = parseAmountInput(rawShare, store.trip?.currency || 'toman');
        newShares[pid] = val;
      } else {
        newShares[pid] = participantShares[pid] || 0;
      }
      const lockBtn = form.querySelector(`[data-lock="${pid}"]`);
      if (lockBtn?.classList.contains('locked')) {
        newLocked.push(pid);
      }
    }
    // Remove stale entries for unselected participants
    for (const pid of Object.keys(newShares)) {
      if (!participants.includes(pid)) {
        delete newShares[pid];
      }
    }
    participantShares = newShares;
    lockedParticipants = newLocked;

    // Recalculate shares if anything changed
    const chargeTotal = getChargeTotal();
    if (participants.length > 0 && chargeTotal > 0) {
      const fixedAmounts = {};
      for (const pid of lockedParticipants) {
        fixedAmounts[pid] = participantShares[pid] || 0;
      }
      const result = recalculateShares({
        participantIds: participants,
        lockedIds: lockedParticipants,
        fixedAmounts,
        totalExpense: chargeTotal
      });
      for (const item of result) {
        participantShares[item.memberId] = item.amount;
      }
    }

    // Convert shares to weights for storage
    if (participants.length > 0) {
        const equalShare = chargeTotal > 0 ? chargeTotal / participants.length : 1;
          const w = {};
          for (const pid of participants) {
            w[pid] = Math.max(1, Math.round((participantShares[pid] || 0) / equalShare * 100));
          }
      shareWeights = w;
    }
  } else {
    shareWeights = null;
    lockedParticipants = [];
    participantShares = {};
  }

  state.expenseDraft = {
    title: data.get('title') || '',
    icon: data.get('icon') || 'food',
    date: data.get('date') || '',
    taxType: data.get('taxType') || '',
    taxValue: data.get('taxValue') || '0',
    participants,
    shareWeights,
    lockedParticipants,
    participantShares,
    notes: data.get('notes') || ''
  };
}

function syncChargeDraft() {
  state.chargeDraft = [...app.querySelectorAll('[data-charge-row]')].map((row) => ({
    payerMemberId: row.querySelector('[name="payerMemberId"]').value,
    amount: row.querySelector('[name="chargeAmount"]').value,
    note: row.querySelector('[name="chargeNote"]').value
  }));
}

function exportJson() {
  const blob = new Blob([JSON.stringify(store.trip, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${store.trip.name || 'dong-trip'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  file.text().then((text) => {
    importTrip(JSON.parse(text));
    showToast(store.language === 'fa' ? 'سفر وارد شد.' : 'Trip imported.');
  }).catch(() => showToast(store.language === 'fa' ? 'فایل معتبر نیست.' : 'Invalid file.'));
}

function loadTripData(tripId) {
  return getTripPreview(tripId);
}

function scheduleScroll(selector) {
  requestAnimationFrame(() => {
    const el = app.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderFilteredOnly() {
  const list = app.querySelector('#expenses-list');
  if (list) {
    list.innerHTML = renderFilteredExpenses();
  } else {
    render();
  }
}

function initJalaliPicker() {
  if (typeof jalaliDatepicker === 'undefined') return;
  const opts = {
    persianDigits: store.digits === 'persian',
    hideAfterChange: true,
    showTodayBtn: true,
    showEmptyBtn: true,
    showCloseBtn: false,
    useDropDownYears: true,
    autoHide: true,
    date: true,
    time: false,
    hasSecond: false,
    separatorChars: { date: '-', between: ' ', time: ':' }
  };
  jalaliDatepicker.startWatch(opts);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          const msg = store.language === 'fa'
            ? 'نسخه جدید موجود است — برای به‌روزرسانی بزنید'
            : 'New version available — click to update';
          showToast(msg, () => {
            installing.postMessage('skip-waiting');
          });
        }
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function allMembers() {
  return store.trip?.families.flatMap((family) => family.members) || [];
}

function memberById(memberId) {
  return allMembers().find((member) => member.id === memberId);
}

function familyForMember(memberId) {
  return store.trip.families.find((family) => family.members.some((member) => member.id === memberId));
}

function money(value) {
  return formatMoney(value, store.trip.currency, store.language, store.digits);
}

function getChargeTotal() {
  const curr = store.trip?.currency || 'toman';
  return state.chargeDraft.reduce((sum, c) => {
    return sum + parseAmountInput(c.amount, curr);
  }, 0);
}

function dateInputHtml(name, value, calendar) {
  if (calendar === 'jalali') {
    let displayValue = value || '';
    if (value) {
      const yr = parseInt(value.slice(0, 4), 10);
      if (yr >= 1900 && yr <= 2100) {
        displayValue = dateInputValue(value, 'jalali', 'en');
      }
    }
    return `<div style="display:flex;gap:var(--space-2);align-items:center"><input name="${name}" type="text" data-jdp value="${escapeAttr(displayValue)}" style="flex:1" autocomplete="off"></div>`;
  }
  return `<div style="display:flex;gap:var(--space-2);align-items:center"><input name="${name}" type="date" value="${escapeAttr(value)}" style="flex:1"></div>`;
}

function renderEmpty(key) {
  return `<div class="empty-state"><p>${t(store.language, key)}</p></div>`;
}

function icon(name) {
  const map = { food: 'food', lodging: 'lodging', car: 'car', bag: 'bag', fuel: 'fuel', ticket: 'ticket', other: 'other', route: 'route', wallet: 'wallet', users: 'users', trash: 'trash', plus: 'plus', edit: 'edit', 'arrow-left': 'arrow-left', print: 'print', search: 'search', dashboard: 'home', expenses: 'list', settlement: 'wallet', settings: 'settings', archive: 'archive' };
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${map[name] || 'wallet'}"></use></svg>`;
}

function selected(value, expected) {
  return value === expected ? 'selected' : '';
}

function initial(value) {
  return escapeHtml(String(value || '?').trim().slice(0, 1));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function showToast(message, action) {
  const toast = app.querySelector('#toast');
  if (!toast) return;
  toast.innerHTML = action
    ? `<span style="flex:1">${escapeHtml(message)}</span><button class="button" style="min-height:36px;padding:0 var(--space-3)">${t(store.language, 'save')}</button>`
    : escapeHtml(message);
  toast.hidden = false;
  if (action) {
    toast.querySelector('button')?.addEventListener('click', action, { once: true });
  }
  window.clearTimeout(toast._timeout);
  toast._timeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 8000);
}
