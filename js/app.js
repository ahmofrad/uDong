import { store, initStore, subscribe, setPreference, setView, closeTrip } from './state/store.js';
import { formatMoney, parseAmountInput } from './utils/currency.js';
import { dateInputValue } from './utils/date.js';
import { t, directionFor } from './utils/i18n.js';

import { createViewContext } from './views/viewContext.js';
import * as tripList from './views/tripList.js';
import * as tripSetup from './views/tripSetup.js';
import * as dashboard from './views/dashboard.js';
import * as expenses from './views/expenses.js';
import * as settlement from './views/settlement.js';
import * as settings from './views/settings.js';
import * as expenseCard from './views/expenseCard.js';

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

// Build the shared context once; helpers are stable function references.
const ctx = createViewContext({
  app,
  state,
  render,
  helpers: {
    icon, selected, initial, escapeHtml, escapeAttr, showToast, money,
    dateInputHtml, renderEmpty, getChargeTotal, scheduleScroll,
    allMembers, memberById, familyForMember
  }
});

// Give every view module access to the shared context.
for (const mod of [tripList, tripSetup, dashboard, expenses, settlement, settings, expenseCard]) {
  mod.initView(ctx);
}

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
      ${store.trip ? renderCurrentView() : (store.view === 'newTrip' ? tripSetup.renderTripSetup() : tripList.renderTripList())}
    </main>
    ${renderFooter()}
    <div id="toast" class="toast" hidden></div>
  `;

  bindGlobalEvents();
  if (store.trip) {
    bindAppEvents();
  } else if (store.view === 'newTrip') {
    tripSetup.bindTripSetupEvents();
  } else {
    tripList.bindTripListEvents();
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

function renderFooter() {
  return `
    <footer class="app-footer">
      <span>${t(store.language, 'madeBy')}</span>
      <a class="footer-github" href="https://github.com/ahmofrad/uDong" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
        ${icon('github')}
      </a>
    </footer>
  `;
}

function renderCurrentView() {
  if (store.view === 'expenses') return expenses.renderExpensesView();
  if (store.view === 'settlement') return settlement.renderSettlementView();
  if (store.view === 'settings') return settings.renderSettingsView();
  return dashboard.renderDashboard();
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

function bindAppEvents() {
  if (store.view === 'expenses') expenses.bindExpensesEvents();
  else if (store.view === 'settlement') settlement.bindSettlementEvents();
  else if (store.view === 'settings') settings.bindSettingsEvents();
  // dashboard has no interactive bindings of its own
}

// ---- shared helpers (passed to view modules via ctx) ----

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
  const map = { food: 'food', lodging: 'lodging', car: 'car', bag: 'bag', fuel: 'fuel', ticket: 'ticket', other: 'other', route: 'route', wallet: 'wallet', users: 'users', trash: 'trash', plus: 'plus', edit: 'edit', 'arrow-left': 'arrow-left', print: 'print', search: 'search', dashboard: 'home', expenses: 'list', settlement: 'wallet', settings: 'settings', archive: 'archive', github: 'github', download: 'download', upload: 'upload' };
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

function scheduleScroll(selector) {
  requestAnimationFrame(() => {
    const el = app.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
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
