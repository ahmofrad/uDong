import { store } from '../state/store.js';
import { formatDate } from '../utils/date.js';
import { calculateExpenseTotal, calculatePerFamilyPaid, calculatePerPersonPaid } from '../utils/settlementEngine.js';
import { t } from '../utils/i18n.js';
import { isExpenseValid } from '../utils/validators.js';
import { renderExpenseCard } from './expenseCard.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderDashboard() {
  const trip = store.trip;
  const total = trip.expenses.reduce((sum, expense) => sum + (isExpenseValid(expense) ? calculateExpenseTotal(expense).expenseTotal : 0), 0);
  const familyStats = calculatePerFamilyPaid(trip);
  const topPayers = calculatePerPersonPaid(trip).slice(0, 5);
  return `
    <section class="summary-grid">
      <div class="stat"><span>${t(store.language, 'totalSpend')}</span><strong>${ctx.money(total)}</strong></div>
      <div class="stat"><span>${t(store.language, 'familyCount')}</span><strong>${trip.families.length}</strong></div>
      <div class="stat"><span>${t(store.language, 'expenseCount')}</span><strong>${trip.expenses.length}</strong></div>
    </section>
    <section class="panel">
      <h2>${t(store.language, 'familyCount')}</h2>
      <div class="bar-chart">
        ${familyStats.map((stat) => `
          <div class="bar-row">
            <span class="avatar" style="--chip-color:${stat.colorHex}">${ctx.initial(stat.familyName)}</span>
            <span class="bar-label">${ctx.escapeHtml(stat.familyName)}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${stat.pct}%;background:${stat.colorHex}"></span></span>
            <span class="bar-value">${ctx.money(stat.paid)}</span>
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
            const t2 = calculateExpenseTotal(e);
            cats[e.icon || 'other'] = (cats[e.icon || 'other'] || 0) + t2.expenseTotal;
          }
          const max = Math.max(...Object.values(cats), 1);
          return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([catKey, amount]) => `
            <div class="bar-row">
              <span class="brand-mark" style="width:32px;height:32px;border-radius:8px">${ctx.icon(catKey)}</span>
              <span class="bar-label">${t(store.language, 'category' + catKey.charAt(0).toUpperCase() + catKey.slice(1)) || catKey}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${(amount / max * 100).toFixed(1)}%;background:var(--color-primary)"></span></span>
              <span class="bar-value">${ctx.money(amount)}</span>
            </div>
          `).join('');
        })()}
      </div>
    </section>
    <section class="grid">
      <section class="panel">
        <h2>${ctx.escapeHtml(trip.name)}</h2>
        <p class="muted">${t(store.language, 'calendar')}: ${t(store.language, trip.dateCalendar)} · ${t(store.language, 'currency')}: ${t(store.language, trip.currency)} · ${formatDate(trip.tripDate, trip.dateCalendar, store.language)}</p>
        <div class="list">${trip.families.map(renderFamilyCard).join('')}</div>
      </section>
      <section class="panel">
        <div class="inline-actions">
          <h2>${t(store.language, 'expenses')}</h2>
          <button class="button secondary" data-view="expenses">${ctx.icon('plus')}${t(store.language, 'addExpense')}</button>
        </div>
        ${topPayers.length ? `
          <h3>${store.language === 'fa' ? 'پرداخت‌کنندگان برتر' : 'Top payers'}</h3>
          <div class="bar-chart" style="margin-block-end:var(--space-4)">
            ${topPayers.map((stat) => {
              const family = trip.families.find((f) => f.id === stat.familyId);
              return `
                <div class="bar-row">
                  <span class="avatar" style="--chip-color:${family?.colorHex || '#888'}">${ctx.initial(stat.memberName)}</span>
                  <span class="bar-label">${ctx.escapeHtml(stat.memberName)}</span>
                  <span class="bar-track"><span class="bar-fill" style="width:${stat.pct}%;background:var(--color-primary)"></span></span>
                  <span class="bar-value">${ctx.money(stat.paid)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        ${trip.expenses.length ? `<div class="list">${trip.expenses.slice(0, 5).map(renderExpenseCard).join('')}</div>` : ctx.renderEmpty('noExpenses')}
      </section>
    </section>
  `;
}

function renderFamilyCard(family) {
  return `
    <article class="card">
      <div class="family-row">
        <span class="color-dot" style="--chip-color:${family.colorHex}"></span>
        <h3>${ctx.escapeHtml(family.name)}</h3>
      </div>
      <div class="member-list">
        ${family.members.map((member) => `<span class="chip"><span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(member.name)}</span>${ctx.escapeHtml(member.name)}</span>`).join('')}
      </div>
    </article>
  `;
}
