import { store, updateTrip, setView } from '../state/store.js';
import { createCharge, createExpense } from '../state/schema.js';
import { parseAmountInput, formatInputValue } from '../utils/currency.js';
import { parseDate } from '../utils/date.js';
import { recalculateShares } from '../utils/settlementEngine.js';
import { t } from '../utils/i18n.js';
import { isExpenseValid } from '../utils/validators.js';
import { renderExpenseCard } from './expenseCard.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderExpensesView() {
  const { state } = ctx;
  return `
    <div class="grid">
      <section class="panel">
        <h2>${state.editingExpenseId ? t(store.language, 'editExpense') : t(store.language, 'addExpense')}</h2>
        ${state.lastError ? `<p class="error" role="alert">${state.lastError}</p>` : ''}
        <form id="expense-form" class="form-grid">
          <label class="field">
            <span>${t(store.language, 'expenseTitle')}</span>
            <input name="title" required value="${ctx.escapeAttr(state.expenseDraft.title)}">
          </label>
          <label class="field">
            <span>${t(store.language, 'category')}</span>
            <select name="icon">
              <option value="food" ${ctx.selected(state.expenseDraft.icon, 'food')}>${t(store.language, 'categoryFood')}</option>
              <option value="lodging" ${ctx.selected(state.expenseDraft.icon, 'lodging')}>${t(store.language, 'categoryLodging')}</option>
              <option value="car" ${ctx.selected(state.expenseDraft.icon, 'car')}>${t(store.language, 'categoryCar')}</option>
              <option value="fuel" ${ctx.selected(state.expenseDraft.icon, 'fuel')}>${t(store.language, 'categoryFuel')}</option>
              <option value="ticket" ${ctx.selected(state.expenseDraft.icon, 'ticket')}>${t(store.language, 'categoryTicket')}</option>
              <option value="bag" ${ctx.selected(state.expenseDraft.icon, 'bag')}>${t(store.language, 'categoryBag')}</option>
              <option value="other" ${ctx.selected(state.expenseDraft.icon, 'other')}>${t(store.language, 'categoryOther')}</option>
            </select>
          </label>
          <label class="field">
            <span>${t(store.language, 'expenseDate')}</span>
            ${ctx.dateInputHtml('date', state.expenseDraft.date, store.trip?.dateCalendar || 'jalali')}
          </label>
          <label class="field">
            <span>${t(store.language, 'taxType')}</span>
            <select name="taxType">
              <option value="" ${ctx.selected(state.expenseDraft.taxType, '')}>${t(store.language, 'noTax')}</option>
              <option value="percent" ${ctx.selected(state.expenseDraft.taxType, 'percent')}>${t(store.language, 'percent')}</option>
              <option value="fixed" ${ctx.selected(state.expenseDraft.taxType, 'fixed')}>${t(store.language, 'fixed')}</option>
            </select>
          </label>
          <label class="field" id="tax-value-field" ${state.expenseDraft.taxType ? '' : 'hidden'}>
            <span>${t(store.language, 'taxValue')}</span>
            <input name="taxValue" inputmode="decimal" value="${ctx.escapeAttr(state.expenseDraft.taxValue)}">
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
              <button class="button secondary" id="add-charge-row" type="button">${ctx.icon('plus')}${t(store.language, 'payer')}</button>
            </div>
            <div class="list">${state.chargeDraft.map(renderChargeDraftRow).join('')}</div>
          </div>
          <label class="field full">
            <span>${t(store.language, 'notes')}</span>
            <textarea name="notes">${ctx.escapeHtml(state.expenseDraft.notes)}</textarea>
          </label>
          <button class="button full" type="submit">${ctx.icon('wallet')}${state.editingExpenseId ? t(store.language, 'saveExpense') : t(store.language, 'addExpense')}</button>
          <button class="button secondary full" type="button" id="cancel-edit-expense" style="margin-block-start:var(--space-2)">${t(store.language, 'cancel')}</button>
        </form>
      </section>
      <section class="panel">
        <h2>${t(store.language, 'expenses')}</h2>
        <div class="form-grid" style="margin-block-end:var(--space-4)">
          <label class="field">
            <span>${store.language === 'fa' ? 'جستجو' : 'Search'}</span>
            <input id="expense-search" value="${ctx.escapeAttr(state.expenseFilter.search)}" placeholder="${t(store.language, 'expenseTitle')}...">
          </label>
          <label class="field">
            <span>${t(store.language, 'category')}</span>
            <select id="expense-category-filter">
              <option value="" ${ctx.selected(state.expenseFilter.category, '')}>${store.language === 'fa' ? 'همه' : 'All'}</option>
              <option value="food" ${ctx.selected(state.expenseFilter.category, 'food')}>${t(store.language, 'categoryFood')}</option>
              <option value="lodging" ${ctx.selected(state.expenseFilter.category, 'lodging')}>${t(store.language, 'categoryLodging')}</option>
              <option value="car" ${ctx.selected(state.expenseFilter.category, 'car')}>${t(store.language, 'categoryCar')}</option>
              <option value="fuel" ${ctx.selected(state.expenseFilter.category, 'fuel')}>${t(store.language, 'categoryFuel')}</option>
              <option value="ticket" ${ctx.selected(state.expenseFilter.category, 'ticket')}>${t(store.language, 'categoryTicket')}</option>
              <option value="bag" ${ctx.selected(state.expenseFilter.category, 'bag')}>${t(store.language, 'categoryBag')}</option>
              <option value="other" ${ctx.selected(state.expenseFilter.category, 'other')}>${t(store.language, 'categoryOther')}</option>
            </select>
          </label>
        </div>
        <div id="expenses-list">${renderFilteredExpenses()}</div>
      </section>
    </div>
  `;
}

export function renderFilteredExpenses() {
  const { state } = ctx;
  const { search, category } = state.expenseFilter;
  const filtered = store.trip.expenses.filter((expense) => {
    if (search && !expense.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && expense.icon !== category) return false;
    return true;
  });
  return filtered.length
    ? `<div class="list">${filtered.map(renderExpenseCard).join('')}</div>`
    : ctx.renderEmpty('noExpenses');
}

function renderParticipantCheck(member) {
  const { state } = ctx;
  const family = ctx.familyForMember(member.id);
  const isSelected = state.expenseDraft.participants.includes(member.id);
  const hasUnequal = !!state.expenseDraft.shareWeights;
  const isLocked = state.expenseDraft.lockedParticipants?.includes(member.id);
  const share = state.expenseDraft.participantShares?.[member.id];

  if (!hasUnequal) {
    return `
      <label class="check-row">
        <input type="checkbox" name="participants" value="${member.id}" ${isSelected ? 'checked' : ''}>
        <span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(member.name)}</span>
        <span>${ctx.escapeHtml(member.name)}</span>
      </label>
    `;
  }

  const formattedShare = share != null ? ctx.money(share) : '';
  const displayShare = share != null ? formatInputValue(String(share)) : '';
  return `
    <div class="check-row" data-participant-row="${member.id}" style="min-height:32px;padding:var(--space-1) var(--space-2);display:grid;grid-template-columns:auto minmax(120px,1fr) auto auto;gap:var(--space-2);align-items:center">
      <label style="display:flex;align-items:center;gap:var(--space-2);min-width:0;cursor:pointer">
        <input type="checkbox" name="participants" value="${member.id}" ${isSelected ? 'checked' : ''}>
        <span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(member.name)}</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ctx.escapeHtml(member.name)}</span>
      </label>
      <div style="display:flex;gap:var(--space-1);align-items:center;width:100%">
        <input name="share_${member.id}" type="text" inputmode="decimal" value="${ctx.escapeAttr(displayShare)}" class="share-input" data-share-member="${member.id}" placeholder="${store.language === 'fa' ? 'سهم' : 'Share'}" ${isSelected ? '' : 'disabled'} style="flex:1;min-width:0;width:auto">
        <span class="currency-badge" ${isSelected ? '' : 'hidden'}>${currencyLabel()}</span>
      </div>
      <button type="button" class="lock-btn ${isLocked ? 'locked' : ''}" data-lock="${member.id}" aria-label="${isLocked ? (store.language === 'fa' ? 'باز کردن قفل' : 'Unlock') : (store.language === 'fa' ? 'قفل کردن' : 'Lock')}" ${isSelected ? '' : 'hidden'}>${isLocked ? '🔒' : '🔓'}</button>
      <span ${isSelected && formattedShare ? '' : 'hidden'} style="font-size:0.78rem;color:var(--color-muted);white-space:nowrap;text-align:right;direction:ltr">${formattedShare}</span>
    </div>
  `;
}

function renderFamilyParticipantGroup(family) {
  const hasUnequal = !!ctx.state.expenseDraft.shareWeights;
  return `
    <div class="family-group" data-family-group="${family.id}">
      <div class="family-group-header">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <span class="family-name">${ctx.escapeHtml(family.name)}</span>
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
          ${ctx.allMembers().map((member) => `<option value="${member.id}" ${ctx.selected(charge.payerMemberId, member.id)}>${ctx.escapeHtml(member.name)} · ${ctx.escapeHtml(ctx.familyForMember(member.id).name)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span>${t(store.language, 'amount')}</span>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <input name="chargeAmount" inputmode="decimal" value="${ctx.escapeAttr(formatInputValue(charge.amount))}" required class="charge-amount-input" style="flex:1">
          <span class="currency-badge">${currencyLabel()}</span>
        </div>
      </label>
      <label class="field full">
        <span>${t(store.language, 'notes')}</span>
        <input name="chargeNote" value="${ctx.escapeAttr(charge.note || '')}">
      </label>
      ${index > 0 ? `<button class="icon-button" type="button" data-remove-charge="${index}" aria-label="Remove">${ctx.icon('trash')}</button>` : ''}
    </div>
  `;
}

function currencyLabel() {
  const trip = store.trip;
  if (!trip) return '';
  const meta = { toman: 'تومان', usd: '$', eur: '€' };
  return meta[trip.currency] || trip.currency;
}

function renderParticipantSharesPreview() {
  const { state } = ctx;
  const draft = state.expenseDraft;
  const chargeTotal = ctx.getChargeTotal();
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
        <span class="share-preview-value">${ctx.money(chargeTotal)}</span>
      </div>
      ${anyLocked ? `
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'قفل شده' : 'Locked'}</span>
          <span class="share-preview-value">${ctx.money(lockedTotal)}</span>
        </div>
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'باقی‌مانده' : 'Remaining'}</span>
          <span class="share-preview-value">${ctx.money(remaining)}</span>
        </div>
        <div class="share-preview-row" style="border-top:1px solid var(--color-border);padding-top:var(--space-2);margin-top:var(--space-2)">
          <span class="share-preview-label">${store.language === 'fa' ? 'سهم هر نفر (باز)' : 'Per unlocked'}</span>
          <span class="share-preview-value">${unlockedCount > 0 ? ctx.money(unlockedShare) : '—'}</span>
        </div>
      ` : `
        <div class="share-preview-row">
          <span class="share-preview-label">${store.language === 'fa' ? 'سهم هر نفر' : 'Per person'}</span>
          <span class="share-preview-value">${unlockedCount > 0 ? ctx.money(unlockedShare) : '—'}</span>
        </div>
      `}
      <div class="share-preview-row" style="font-size:0.78rem;color:var(--color-muted);margin-top:var(--space-1)">
        <span>${draft.participants.length} ${store.language === 'fa' ? 'نفر' : 'participant(s)'}</span>
        <span>${anyLocked ? `${locked.length} ${store.language === 'fa' ? 'نفر قفل' : 'locked'}` : store.language === 'fa' ? 'همگی باز' : 'all unlocked'}</span>
      </div>
    </div>
  `;
}

export function bindExpensesEvents() {
  const { app, state, render } = ctx;
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
      const taxValue = expense.tax ? String(expense.tax.value) : '0';
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

  app.querySelector('#toggle-weights')?.addEventListener('change', (e) => {
    syncExpenseDraft();
    syncChargeDraft();
    if (e.target.checked) {
      const chargeTotal = ctx.getChargeTotal();
      const participants = ctx.allMembers().map((m) => m.id);
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
        const chargeTotal = ctx.getChargeTotal();
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
        const chargeTotal = ctx.getChargeTotal();
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

  app.querySelectorAll('[data-share-member]').forEach((input) => {
    input.addEventListener('change', function () {
      const memberId = this.dataset.shareMember;
      syncExpenseDraft();
      syncChargeDraft();
      const chargeTotal = ctx.getChargeTotal();
      const participants = state.expenseDraft.participants || [];
      const shares = state.expenseDraft.participantShares || {};
      const locked = state.expenseDraft.lockedParticipants || [];
      const raw = this.value.replace(/,/g, '');
      const shareVal = parseAmountInput(raw, store.trip?.currency || 'toman');
      shares[memberId] = shareVal;
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

  app.querySelectorAll('input[name="chargeAmount"]').forEach((input) => {
    input.addEventListener('input', function () {
      const formatted = formatInputValue(this.value);
      if (formatted !== this.value) {
        this.value = formatted;
      }
    });
  });
}

function updateSelectAllStates() {
  const { app } = ctx;
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
  const { app } = ctx;
  const all = app.querySelectorAll('[name="participants"]');
  const checked = app.querySelectorAll('[name="participants"]:checked');
  const globalCb = app.querySelector('#participant-select-all');
  if (globalCb) globalCb.checked = all.length > 0 && all.length === checked.length;
}

function renderFilteredOnly() {
  const { app, render } = ctx;
  const list = app.querySelector('#expenses-list');
  if (list) {
    list.innerHTML = renderFilteredExpenses();
  } else {
    render();
  }
}

function submitExpense(event) {
  event.preventDefault();
  const { state, render } = ctx;
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
  ctx.scheduleScroll('#expenses-list');
}

function syncExpenseDraft() {
  const { app, state } = ctx;
  const form = app.querySelector('#expense-form');
  if (!form) return;
  const data = new FormData(form);
  const participants = data.getAll('participants');
  const toggle = form.querySelector('#toggle-weights');
  let shareWeights = state.expenseDraft.shareWeights;
  let lockedParticipants = state.expenseDraft.lockedParticipants || [];
  let participantShares = state.expenseDraft.participantShares || {};

  if (toggle?.checked) {
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
    for (const pid of Object.keys(newShares)) {
      if (!participants.includes(pid)) {
        delete newShares[pid];
      }
    }
    participantShares = newShares;
    lockedParticipants = newLocked;

    const chargeTotal = ctx.getChargeTotal();
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
  const { app, state } = ctx;
  state.chargeDraft = [...app.querySelectorAll('[data-charge-row]')].map((row) => ({
    payerMemberId: row.querySelector('[name="payerMemberId"]').value,
    amount: row.querySelector('[name="chargeAmount"]').value,
    note: row.querySelector('[name="chargeNote"]').value
  }));
}
