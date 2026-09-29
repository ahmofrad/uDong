import { store } from '../state/store.js';
import { formatDate } from '../utils/date.js';
import { calculateExpenseTotal } from '../utils/settlementEngine.js';
import { t } from '../utils/i18n.js';
import { isExpenseValid } from '../utils/validators.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderExpenseCard(expense) {
  const { expenseTotal, taxAmount } = calculateExpenseTotal(expense);
  const valid = isExpenseValid(expense);
  const payerIds = [...new Set(expense.charges.map((c) => c.payerMemberId).filter(Boolean))];
  const payers = payerIds.map((id) => ctx.memberById(id)).filter(Boolean);
  return `
    <article class="card">
      <div class="expense-row">
        <span class="brand-mark" style="width:40px;height:40px;border-radius:12px">${ctx.icon(expense.icon || 'wallet')}</span>
        <div style="min-width:0; flex:1">
          <h3>${ctx.escapeHtml(expense.title)}</h3>
          <p class="muted">${formatDate(expense.date, store.trip.dateCalendar, store.language)} · ${ctx.money(expenseTotal)}${expense.tax?.type && expense.tax.type !== 'none' ? ` · ${t(store.language, 'taxValue')}: ${ctx.money(taxAmount)}` : ''}</p>
          ${payers.length ? `<p class="muted" style="font-size:0.82em;margin-block-start:var(--space-1)"><span style="opacity:0.6">${t(store.language, 'paidBy')}:</span> ${payers.map((m) => {
            const f = ctx.familyForMember(m.id);
            return `<span class="chip" style="font-size:0.78rem;padding:1px var(--space-2)"><span class="avatar" style="--chip-color:${f.colorHex};width:16px;height:16px;font-size:0.6rem">${ctx.initial(m.name)}</span>${ctx.escapeHtml(m.name)}</span>`;
          }).join(' ')}</p>` : ''}
        </div>
        <button class="icon-button" data-edit-expense="${expense.id}" aria-label="${t(store.language, 'editExpense')}" title="${t(store.language, 'editExpense')}">${ctx.icon('edit')}</button>
        <button class="icon-button" data-delete-expense="${expense.id}" aria-label="Delete">${ctx.icon('trash')}</button>
      </div>
      <div class="chips" style="margin-block-end:var(--space-2)">${expense.participantMemberIds.map((id) => ctx.memberById(id)).filter(Boolean).map((member) => {
        const family = ctx.familyForMember(member.id);
        return `<span class="chip"><span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(member.name)}</span>${ctx.escapeHtml(member.name)}</span>`;
      }).join('')}</div>
      ${expense.notes ? `<p class="muted" style="font-size:0.85em;margin-block-end:var(--space-1)"><span style="opacity:0.6">${t(store.language, 'expenseNote')}:</span> ${ctx.escapeHtml(expense.notes)}</p>` : ''}
      ${valid ? '' : `<p class="error">${t(store.language, 'invalidExpense')}</p>`}
    </article>
  `;
}
