import { store, updateTrip } from '../state/store.js';
import { calculateSettlement } from '../utils/settlementEngine.js';
import { t, directionFor } from '../utils/i18n.js';

let ctx;

export function initView(context) {
  ctx = context;
}

export function renderSettlementView() {
  const result = calculateSettlement(store.trip);
  const familyById = new Map(store.trip.families.map((family) => [family.id, family]));
  const settled = new Set(store.trip.settledTransfers || []);
  return `
    <section class="panel" id="settlement-panel">
      <div class="inline-actions">
        <h2>${t(store.language, 'settlement')}</h2>
        <button class="button secondary" id="print-settlement" type="button">${ctx.icon('print')}${t(store.language, 'printSettlement')}</button>
      </div>
      ${result.transfers.length ? `
        <div class="list">
          ${result.transfers.map((transfer, index) => {
            const from = familyById.get(transfer.from);
            const to = familyById.get(transfer.to);
            const key = `${transfer.from}_${transfer.to}_${transfer.amount}_${index}`;
            const arrow = store.language === 'fa' ? '←' : '→';
            return `
              <label class="card settlement-row" data-settle-key="${key}">
                <input type="checkbox" class="settle-checkbox" data-settle-key="${key}" ${settled.has(key) ? 'checked' : ''} style="width:18px;min-height:18px">
                <span class="avatar" style="--chip-color:${from.colorHex}">${ctx.initial(from.name)}</span>
                <strong>${ctx.escapeHtml(from.name)}</strong>
                <span class="muted">${arrow}</span>
                <span class="avatar" style="--chip-color:${to.colorHex}">${ctx.initial(to.name)}</span>
                <strong>${ctx.escapeHtml(to.name)}</strong>
                <span>${ctx.money(transfer.amount)}</span>
              </label>
            `;
          }).join('')}
        </div>
        <p class="muted" style="margin-block-start:var(--space-3)">${store.language === 'fa' ? 'گزینه‌های تسویه شده را تیک بزنید.' : 'Check off settled transfers.'}</p>
      ` : ctx.renderEmpty('noSettlement')}
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
            return `<div class="family-row" style="padding:var(--space-1) var(--space-3);font-size:0.85em;opacity:0.8"><span class="avatar" style="--chip-color:${family.colorHex};width:24px;height:24px;font-size:0.7rem">${ctx.initial(m.name)}</span><span>${ctx.escapeHtml(m.name)}</span><span>${ctx.money(mb)}</span></div>`;
          }).join('');
          return `<div class="card"><div class="family-row"><span class="avatar" style="--chip-color:${family.colorHex}">${ctx.initial(family.name)}</span><strong>${ctx.escapeHtml(family.name)}</strong><span>${ctx.money(balance)}</span></div>${memberRows}</div>`;
        }).join('')}
      </div>
    </section>
  `;
}

export function bindSettlementEvents() {
  const { app } = ctx;
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
      <head><meta charset="UTF-8"><title>${t(store.language, 'settlement')} - ${ctx.escapeHtml(store.trip.name)}</title>
      <style>
        body{font-family:sans-serif;padding:2em;max-width:700px;margin:0 auto;direction:${dir}}
        .settlement-row{display:flex;align-items:center;gap:0.75em;padding:0.75em;border:1px solid #ddd;border-radius:8px;margin-block-end:0.5em}
        .avatar{display:inline-flex;width:32px;height:32px;border-radius:50%;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:0.85rem}
        .muted{color:#666}
      </style>
      </head>
      <body>
        <h1>${ctx.escapeHtml(store.trip.name)} - ${t(store.language, 'settlement')}</h1>
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
}
