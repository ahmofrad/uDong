# AGENTS.md — Trip "Dong" Splitter PWA (دنگ‌حساب سفر)

> A fully client-side Progressive Web App that splits shared trip costs between
> **families** and produces a final **family-to-family** settlement.

---

## 0. Glossary (Persian domain term → code concept)

| Persian term | Code concept | Notes |
|---|---|---|
| سفر | `Trip` | top-level container, has a name |
| خانواده | `Family` | group of people, gets an accent color |
| نفرات | `Member` | a person belonging to a `Family` |
| هزینه | `Expense` | a cost item; has participants + optional tax + 1..n charges |
| خرج | `Charge` | one payment line inside an `Expense`; has amount + payer |
| هزینه‌کننده | `payerMemberId` | the member who actually paid a `Charge` |
| دنگ / سهم | `share` | each participant's portion of an expense |
| تسویه | `Settlement` | final list of family→family transfers |
| تاریخ | `date` / `dateCalendar` | optional trip/expense date; calendar is chosen per trip |
| ارز | `currency` | required trip currency: Toman, USD, or EUR |

---

## 1. Project Overview

A PWA that lets a group of traveling families:
1. Define the trip, the families, and each family's members.
2. Choose required trip settings up front: calendar and currency.
3. Log expenses, each with a list of members who benefited from it and an
   optional tax (percentage or fixed amount).
4. Break each expense into one or more **charges** — individual payments,
   each with its own payer.
5. Optionally use unequal cost splitting with per-participant lock.
6. Get a final settlement: exactly which family owes which family how much.

The app supports Persian and English UI, with Persian as the default.
Each trip chooses one calendar system during trip creation:
Jalali/Shamsi or Gregorian, with Jalali/Shamsi as the default. Trip date and
expense date are optional, but when present they are displayed and edited
using the trip's selected calendar.

Each trip chooses one required currency during trip creation: Toman, USD,
or EUR, with Toman as the default. All amounts inside a trip use that same
currency in v1.

The app supports multiple trips. Trips can be archived (soft-delete) and
restored later.

No backend, no login, no network dependency for core functionality.
All data lives in the browser (localStorage + Cookies).

---

## 2. Tech Stack

- **Vanilla HTML5 + CSS3 + JavaScript (ES2022, ES Modules)** — no framework,
  no bundler, no build step. The app runs from a static file server
  (or `file://`/GitHub Pages) and works fully offline after first load.
- **Icons**: inline SVG sprite bundled in `index.html` — no runtime CDN
  dependency, works fully offline.
- **Font**: self-hosted `Vazirmatn` (woff2) — same offline reasoning.
- **No charting library** — simple inline SVG bars are enough for summary widgets.
- **Test runner**: `node:test` (built-in Node.js test framework), run via
  `npm test` (executes `node --test tests/*.test.js`).

---

## 3. Project Structure

```
/
├── index.html                    // app shell + inline SVG icon sprite
├── manifest.webmanifest          // PWA manifest
├── service-worker.js             // cache-first offline SW
├── package.json                  // npm test script only
├── serve.cmd                     // local dev server script
├── AGENTS.md                     // this file
├── /css
│   ├── variables.css             // color tokens, spacing, radii, light/dark themes
│   ├── base.css                  // reset, RTL, typography, Vazirmatn @font-face
│   └── components.css            // all component, layout, animation styles
├── /js
│   ├── app.js                    // bootstrap + router + all rendering + event binding
│   ├── state/
│   │   ├── store.js              // in-memory state + persistence calls
│   │   └── schema.js             // data model + schemaVersion + migrations
│   ├── storage/
│   │   ├── localStorageAdapter.js
│   │   └── cookieAdapter.js
│   ├── utils/
│   │   ├── currency.js           // formatting, rounding, minor units
│   │   ├── date.js               // Jalali/Gregorian parsing + formatting
│   │   ├── i18n.js               // fa/en labels, direction, locale helpers
│   │   ├── settlementEngine.js   // pure calculation functions (see §7)
│   │   └── validators.js
├── /assets
│   ├── /icons                    // PWA icons (SVG: 192x192, 512x512, maskable)
│   ├── /fonts                    // Vazirmatn woff2 (latin + arabic)
│   └── /vendors/jalalidatepicker // third-party Jalali date picker (minified JS + CSS)
├── /tests
│   ├── utils.test.js             // currency, date, i18n, validators tests
│   ├── storage.test.js           // localStorage + cookie adapter tests
│   └── settlementEngine.test.js  // settlement algorithm tests
└── /agents/                      // opencode agent skills (internal)
```

Note: All rendering logic lives in `app.js`. There are no separate
`features/` or `components/` directories — the app is a single-page
single-module architecture.

---

## 4. Data Model

```js
Trip {
  id, name, createdAt, schemaVersion,
  dateCalendar: 'jalali' | 'gregorian', // required; default 'jalali'
  currency: 'toman' | 'usd' | 'eur',    // required; default 'toman'
  tripDate: string | null,              // optional ISO date
  archived: boolean,                    // soft-delete flag
  settledTransfers: string[],           // settlement transfer keys checked as done
  families: Family[],
  expenses: Expense[]
}

Family {
  id, name, colorHex,        // auto-assigned from a fixed 10-color palette
  members: Member[]
}

Member {
  id, familyId, name
}

Expense {                     // هزینه
  id, title, icon,            // category icon key
  date: string | null,         // optional ISO date
  participantMemberIds: string[],   // who shares this cost (may span families)
  tax: { type: 'percent' | 'fixed', value: number } | null,  // optional
  shareWeights: object | null,      // { [memberId]: weight } for unequal split
  charges: Charge[],
  notes, createdAt
}

Charge {                      // خرج
  id, amount, payerMemberId, note, createdAt
}
```

Notes:
- Participants and tax live at the **Expense** level (shared by all charges
  inside it). A `Charge` only adds an amount + who paid it.
- A payer does **not** need to be a participant (e.g. a host who fronts
  money but didn't consume).
- The app language is an app-level preference: `fa` or `en`, default `fa`.
  Persian uses RTL layout; English uses LTR layout, controlled via
  `<html lang="..." dir="...">`.
- `dateCalendar` is selected during trip setup. Store optional trip/expense
  dates internally as ISO `YYYY-MM-DD` strings for sorting/export, and
  render/parse them through the trip's chosen calendar.
- `currency` is selected during trip setup and is required. Store monetary
  values as integer minor units for the selected currency: whole Toman for
  `toman`, cents for `usd` and `eur`.
- `shareWeights` on Expense enables unequal cost splitting. When `null`,
  the total is split equally among all participants. When present, each
  participant's share is `total * weight / sum(weights)`.
- `settledTransfers` tracks which settlement rows the user has manually
  checked as settled (local-only, no impact on calculations).
- `archived` allows soft-delete; archived trips are hidden from the main list
  unless the "Show archived" toggle is checked.

---

## 5. Storage Strategy

- **Primary data** (trips, trip settings, families, members, expenses, charges) →
  `localStorage`, as JSON. Key scheme: `dong:trip:<tripId>` per trip. Index
  at `dong:trips:index` (array of `{id, name, archived, updatedAt}`).
  localStorage is sufficient for v1 data volumes.
- **Cookies** → small preferences only, never financial data:
  `dong_active_trip_id`, `dong_theme` (light/dark), `dong_language`
  (`fa`/`en`), `dong_digits` (latin/persian numerals). `SameSite=Lax`,
  ~1 year expiry.
- `schemaVersion` on every stored trip + `migrateTrip()` in `schema.js`
  handles future format changes.
- **Backup / restore** — per-trip backup/restore in the settings view
  (`backup-trip` / `restore-trip`), plus global backup/restore on the trip list
  page (`backup-all-trips` / `restore-trips`). Global restore accepts a JSON
  file containing a single trip or an array of trips, using `saveTrip()` directly
  without changing the active trip. Backup button is disabled when no trips exist.

---

## 6. Core User Flows

1. **Trip list / management** (landing page when no trip is open):
   - Always shows the trip list, even when no trips exist (empty state with
     "Create your first trip" CTA).
   - Each card: trip name, date, currency, family count, expense count.
   - Actions: open trip, archive/unarchive, delete, edit settings.
   - Global backup/restore buttons at the top: "Backup all trips" (disabled
     when no trips exist) and "Restore trips" (file upload, accepts single
     trip or array of trips).
   - `activeTripId` cookie persists which trip was open across refreshes.

2. **Trip setup wizard** (creation or edit):
   Trip name → calendar (default Jalali/Shamsi) → optional trip date →
   required currency (default Toman) → add families (name + auto color) →
   add members per family. Language selector also available during creation.
   Editable later from settings screen.

3. **Dashboard** (landing view inside a trip):
   Summary stats: total spend, per-family spend, per-person top payers,
   category totals bar chart. Navigation via bottom tab bar or top tabs.

4. **Add/edit an expense**:
   Title + category icon (`food`, `lodging`, `car`, `fuel`, `ticket`,
   `bag`, `other`) → optional expense date using the trip's calendar →
   select participants (flat checklist of all members) →
   optionally enable unequal split (toggle → per-participant share inputs
   with lock button) →
   optionally enable tax (toggle → percent or fixed → value) →
   add one or more charges (amount with live comma formatting + payer
   picked from a member list) →
   live preview of expense total and per-person share.

5. **Expense list / search**:
   Cards per expense (icon, title, total, participant avatars, notes),
   text search and category filter, edit/delete, auto-scroll to newly
   added items.

6. **Settlement view (تسویه نهایی)**:
   List of required transfers `خانواده الف → خانواده ب: مقدار`, with amounts
   formatted in the trip's currency; each family's net balance with
   drill-down to per-member balances; "settled" checkbox per transfer
   (stored in `trip.settledTransfers`); printable view via dedicated button.

---

## 7. Settlement / Calculation Algorithm

Implemented as **pure, unit-testable functions** in `settlementEngine.js`.

For each valid `Expense`:
1. `chargesTotal = sum(charge.amount)`
2. `taxAmount = 0` if `tax === null`;
   `tax.value` if `type === 'fixed'`;
   `chargesTotal * tax.value / 100` if `type === 'percent'`.
3. `expenseTotal = chargesTotal + taxAmount`
4. `participantCount = participantMemberIds.length` (must be ≥ 1)
5. If `shareWeights` is set: use `splitWithWeights()` to distribute total
   proportionally across participants; otherwise use equal split.
6. For each participant: `memberBalance[id] -= share`
7. For each charge: `memberBalance[charge.payerMemberId] += charge.amount`

After all expenses:
8. Roll up to family level: `familyBalance[familyId] = Σ memberBalance[m]`
   for every member `m` in that family.
9. **Greedy debt simplification** over `familyBalance`:
   - Split into creditors (`balance > 0`) and debtors (`balance < 0`).
   - Sort both by `|balance|` descending.
   - Repeat: take the largest debtor and largest creditor,
     `amount = min(|debtor.balance|, creditor.balance)`,
     record `{from: debtor, to: creditor, amount}`,
     reduce both balances by `amount`, drop any side that reaches ~0.
   - Epsilon of 1 minor unit to absorb floating point noise.
10. Output: `[{from: familyId, to: familyId, amount}, ...]`.

### Edge cases handled
- Payer who is not a participant → fully supported (credit only, no debit).
- Rounding: integer minor units throughout; remainder pushed onto largest
  share via `splitIntegerAmount()`.
- Trip with only one family → zero transfers ("نیازی به تسویه نیست").
- Deleting a member/family referenced by charges/participants → blocked
  with a warning toast via `isMemberReferenced()`/`isFamilyReferenced()`.

---

## 8. UI / UX Guidelines

- **Language & direction**: Persian (default, RTL) and English (LTR). All UI
  copy from `i18n.js` translation dictionaries, fully offline.
- **Dates**: trip-chosen calendar (Jalali/Shamsi default). Date inputs use
  native `<input type="date">` for Gregorian and `jalalidatepicker` for Jalali.
- **Currency and numbers**: trip-chosen currency (Toman default). Thousands
  separators + currency label/symbol via `formatMoney()`. User-togglable
  Persian-digit preference saved via cookie.
- **Color system**: warm amber/coral primary + cool teal/indigo secondary
  via CSS variables. Each Family gets an auto-assigned, distinct color from
  a fixed 10-color set, reused everywhere (chips, settlement rows).
- **Category icons**: 7 SVG icon categories selected per expense, shown
  consistently in lists, cards, and summary widgets. Additional icons:
  `download`, `upload` for backup/restore buttons, `github` for footer link.
- **Responsive**: mobile-first single column; tablet/desktop gets multi-column
  card layout. Bottom fixed tab bar on mobile (≤600px), horizontal inline
  on desktop.
- **Components**: rounded cards (12px radius), soft shadows, empty states
  (icon + text + CTA), skeleton shimmer loaders, SVG bar charts for
  category totals.
- **Dark mode**: supported via `[data-theme="dark"]` CSS variables, preference
  saved via cookie.
- **Animations**: fade-in on new cards, hover transforms, smooth page
  transitions via CSS `transition`.

---

## 9. PWA Requirements

- `manifest.webmanifest`: name ("دنگ حساب سفر"), short_name ("دنگ سفر"),
  `start_url: "."`, `display: "standalone"`, theme/background colors,
  SVG icon set (192×192, 512×512, maskable variants).
- `service-worker.js`: cache-first for 20 static assets (HTML/CSS/JS/
  fonts/icons/vendor files).   Versioned cache name (`dong-pwa-v9`) with
  `activate` handler that purges old caches. Navigation requests served
  from cached `index.html`. Update toast on new SW version.
- Service worker registered from `app.js` with skip-waiting message support.
- No network calls required for core functionality — no analytics, no
  tracking, all data stays on-device.

---

## 10. Validation Rules

- A trip needs ≥1 family, each family ≥1 member, before expenses can be added.
- A trip must have a valid `dateCalendar` and `currency`. Defaults are
  `jalali` and `toman`.
- `tripDate` and expense `date` are optional, but if present they must be
  valid ISO `YYYY-MM-DD` strings that round-trip correctly.
- An expense needs ≥1 participant and ≥1 charge with `amount > 0` to count
  toward settlement.
- Tax `percent` must be 0–100; `fixed` must be ≥ 0.
- Block deletions that would orphan historical charges.

---

## 11. Testing Notes (45 unit tests, `npm test`)

- **`tests/settlementEngine.test.js`** (7 tests): equal split, percent tax,
  fixed tax, payer-not-participant, single-family trip, multi-family
  rounding, greedy-settle transfer count.
- **`tests/storage.test.js`** (12 tests): localStorage adapter (save/load/
  delete/corrupt), cookie adapter (get/set/overwrite/preferences).
- **`tests/utils.test.js`** (26 tests): currency (`toMinorUnit`,
  `parseAmountInput`, `formatMoney`, `currencyMeta`), date (`isIsoDate`,
  `formatDate`, `jalaliToGregorian`, `parseDate`, `dateInputValue`),
  validators (`validateTrip`, `isExpenseValid`, `isTaxValid`),
  i18n (key parity, fallback, direction).
- All tests use `node:test` (no external test framework) and mocked
  storage/cookie where applicable.

---

## 12. Out of Scope (v1)

- Multi-device sync, accounts, login.
- Multiple currencies inside the same trip and FX conversion.
- Crediting the tax portion separately to whoever fronted it.
- Unequal/custom split weights per participant: **implemented** (see
  `shareWeights` on Expense, `recalculateShares()` in settlement engine,
  lock button + share inputs in UI).
- Multi-trip support: **implemented** (trip list, switch, archive).
- Trip archiving: **implemented** (`archived` field, archive/unarchive UI).
- Edit trip/expense: **implemented** (edit button on cards, settings screen).

---

## 13. Suggested Build Order (followed during development)

1.    Static shell + PWA scaffolding (manifest, service worker, RTL base CSS,
   locally bundled fonts/icons, inline SVG icon sprite).
2. State store + storage adapters (localStorage + cookie) + versioned schema,
   including calendar, currency, language preference, and optional date fields.
3. Trip setup wizard (trip settings/family/member CRUD).
4. Expense + Charge CRUD UI with live total/share preview.
5. `settlementEngine.js` (pure, unit-tested) + Settlement view UI.
6. Polish: colors/icons/responsive/dark mode, export/import, empty states,
   full offline test pass (Lighthouse PWA audit).
7. Multi-trip management + trip list view.
8. Edit expenses + edit trip settings.
9. Unequal cost splitting with lock/share inputs.
10. Archiving (soft-delete) + restore.
11. Search/filter + category totals widget + notes on cards.
12. Animated transitions + skeleton loaders + bottom tab bar.
13. Printable settlement view + settlement drill-down + "settled" checkboxes.
14. Jalalidatepicker integration for Jalali calendar date inputs.
