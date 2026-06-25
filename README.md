# دنگ حساب سفر — Trip Dong Splitter

> A fully offline PWA that splits shared trip costs between **families** and produces a final **family-to-family** settlement.
>
> یک PWA کاملاً آفلاین که هزینه‌های مشترک سفر را بین **خانواده‌ها** تقسیم کرده و تسویه نهایی را نمایش می‌دهد.

---

## Features | قابلیت‌ها

- **Multi-trip management** — create, archive, and switch between trips / مدیریت چند سفر
- **Family & member setup** — define families with colored avatars / تعریف خانواده‌ها با رنگ اختصاصی
- **Expense tracking** — log expenses with category icons, optional tax, and per-participant shares / ثبت هزینه با دسته‌بندی، مالیات و سهم‌بندی
- **Unequal cost splitting** — lock individual shares for custom splits / سهم‌بندی نابرابر با قفل کردن سهم هر نفر
- **Multiple payments per expense** — each expense can have multiple payers (charges) / چند پرداخت‌کننده برای هر هزینه
- **Settlement engine** — greedy debt-simplification algorithm produces minimal family-to-family transfers / الگوریتم تسویه بدهی
- **Bilingual UI** — Persian (RTL) and English (LTR) / رابط کاربری فارسی و انگلیسی
- **Jalali (Shamsi) & Gregorian calendar** — per-trip calendar selection / تقویم شمسی و میلادی
- **Multi-currency** — Toman, USD, EUR with correct formatting / پشتیبانی از تومان، دلار و یورو
- **Dark mode** — light/dark theme toggle / حالت تاریک و روشن
- **Persian digits** — toggle between Latin and Persian numerals / ارقام فارسی و لاتین
- **Offline-first PWA** — works without internet after first load / کاملاً آفلاین
- **JSON export/import** — backup your data / خروجی و ورودی JSON
- **Printable settlement** — print-ready settlement view / نسخه قابل چاپ تسویه
- **Search & filter** — find expenses by title or category / جستجو و فیلتر هزینه‌ها

---

## Tech Stack | تکنولوژی

- **Vanilla HTML5 + CSS3 + JavaScript (ES2022, ES Modules)** — no framework, no build step
- **Self-hosted Vazirmatn font** — fully offline, no CDN dependency
- **Inline SVG icon sprite** — bundled in `index.html`, no runtime icons
- **localStorage** for trip data + **Cookies** for preferences
- **Service Worker** — cache-first offline strategy
- **45 unit tests** via `node:test`

---

## Getting Started | شروع

The app is a static site. No build step required.

```bash
# Install dependencies (none — just run tests)
npm test

# Serve locally (any static file server works)
# Option A: VS Code Live Server
# Option B: Python
python -m http.server 8080
# Option C: Node
npx serve .
```

Open `http://localhost:8080` in your browser.

For the full PWA experience, serve over HTTPS (GitHub Pages, Vercel, or localhost works for service workers).

### Development

```bash
# Run tests
npm test
```

Tests use Node's built-in `node:test` runner — no external test framework needed.

---

## Project Structure | ساختار پروژه

```
├── index.html                   # App shell + SVG icon sprite
├── manifest.webmanifest          # PWA manifest
├── service-worker.js             # Cache-first offline SW
├── package.json                  # npm test script
├── css/
│   ├── variables.css             # Colors, spacing, themes
│   ├── base.css                  # Reset, typography, RTL
│   └── components.css            # All component styles
├── js/
│   ├── app.js                    # Bootstrap + router + rendering + events
│   ├── state/
│   │   ├── store.js              # In-memory state + persistence
│   │   └── schema.js             # Data model + migrations
│   ├── storage/
│   │   ├── localStorageAdapter.js
│   │   └── cookieAdapter.js
│   └── utils/
│       ├── currency.js           # Formatting, rounding, minor units
│       ├── date.js               # Jalali/Gregorian parsing
│       ├── i18n.js               # fa/en translations
│       ├── settlementEngine.js   # Cost-splitting algorithm
│       └── validators.js         # Input validation
├── assets/
│   ├── fonts/                    # Vazirmatn woff2
│   ├── icons/                    # PWA icons (SVG)
│   └── vendors/jalalidatepicker/ # Jalali date picker
└── tests/
    ├── settlementEngine.test.js
    ├── storage.test.js
    └── utils.test.js
```

---

## Data Model | مدل داده

- **Trip** — top-level container with calendar, currency, families, expenses
- **Family** — group of people with a color
- **Member** — person belonging to a family
- **Expense** — cost item with participants, optional tax, charges, and share weights
- **Charge** — individual payment line (amount + payer)

All amounts stored as integer minor units (whole Toman / cents for USD/EUR).

---

## License | مجوز

MIT
