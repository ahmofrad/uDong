# Trip Dong Splitter

> A fully offline PWA that splits shared trip costs between **families** and produces a final **family-to-family** settlement.

---

## Features

- **Multi-trip management** — create, archive, and switch between trips
- **Family & member setup** — define families with colored avatars
- **Expense tracking** — log expenses with category icons, optional tax, and per-participant shares
- **Unequal cost splitting** — lock individual shares for custom splits
- **Multiple payments per expense** — each expense can have multiple payers (charges)
- **Settlement engine** — greedy debt-simplification algorithm produces minimal family-to-family transfers
- **Bilingual UI** — Persian (RTL) and English (LTR)
- **Jalali (Shamsi) & Gregorian calendar** — per-trip calendar selection
- **Multi-currency** — Toman, USD, EUR with correct formatting
- **Dark mode** — light/dark theme toggle
- **Persian digits** — toggle between Latin and Persian numerals
- **Offline-first PWA** — works without internet after first load
- **JSON export/import** — backup your data
- **Printable settlement** — print-ready settlement view
- **Search & filter** — find expenses by title or category

## Tech Stack

- **Vanilla HTML5 + CSS3 + JavaScript (ES2022, ES Modules)** — no framework, no build step
- **Self-hosted Vazirmatn font** — fully offline, no CDN dependency
- **Inline SVG icon sprite** — bundled in `index.html`, no runtime icons
- **localStorage** for trip data + **Cookies** for preferences
- **Service Worker** — cache-first offline strategy
- **45 unit tests** via `node:test`

## Getting Started

The app is a static site. No build step required.

```bash
# Install dependencies (none — just run tests)
npm test

# Serve locally (any static file server works)
# Python
python -m http.server 8080
# Node
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

## Project Structure

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

## Data Model

- **Trip** — top-level container with calendar, currency, families, expenses
- **Family** — group of people with a color
- **Member** — person belonging to a family
- **Expense** — cost item with participants, optional tax, charges, and share weights
- **Charge** — individual payment line (amount + payer)

All amounts stored as integer minor units (whole Toman / cents for USD/EUR).

## License

MIT

---

<br>

<div dir="rtl" lang="fa">

# دنگ حساب سفر

> یک PWA کاملاً آفلاین که هزینه‌های مشترک سفر را بین **خانواده‌ها** تقسیم کرده و تسویه نهایی را نمایش می‌دهد.

---

## قابلیت‌ها

- **مدیریت چند سفر** — ایجاد، بایگانی و جابجایی بین سفرها
- **تعریف خانواده و نفرات** — تعریف خانواده‌ها با رنگ اختصاصی
- **ثبت هزینه** — ثبت هزینه با دسته‌بندی، مالیات و سهم‌بندی
- **سهم‌بندی نابرابر** — قفل کردن سهم هر نفر برای تقسیم دلخواه
- **چند پرداخت‌کننده** — هر هزینه می‌تواند چند پرداخت‌کننده داشته باشد
- **الگوریتم تسویه** — محاسبه تسویه نهایی بین خانواده‌ها با حداقل تعداد تراکنش
- **رابط کاربری دو زبانه** — فارسی و انگلیسی
- **تقویم شمسی و میلادی** — انتخاب تقویم برای هر سفر
- **چند ارز** — پشتیبانی از تومان، دلار و یورو
- **حالت تاریک** — قابلیت تغییر به حالت تاریک و روشن
- **ارقام فارسی** — نمایش اعداد به صورت فارسی یا لاتین
- **آفلاین** — کارکرد کامل بدون نیاز به اینترنت
- **خروجی و ورودی JSON** — پشتیبان‌گیری از اطلاعات
- **نسخه قابل چاپ تسویه** — مشاهده و چاپ تسویه نهایی
- **جستجو و فیلتر** — پیدا کردن هزینه‌ها بر اساس عنوان یا دسته

## تکنولوژی

- **HTML5 + CSS3 + JavaScript (ES2022, ES Modules)** — بدون فریمورک و بدون build step
- **فونت وزیرمتن** — میزبانی شده در پروژه، بدون نیاز به CDN
- **آیکون‌های SVG درون‌ساختی** — bundled در index.html
- **localStorage** برای داده سفرها + **Cookies** برای تنظیمات
- **Service Worker** — استراتژی آفلاین cache-first
- **۴۵ تست واحد** با `node:test`

## شروع کار

برنامه یک سایت استاتیک است و نیازی به build ندارد:

```bash
# نصب وابستگی (فقط برای اجرای تست‌ها)
npm test

# اجرای محلی (با هر سرور فایل استاتیک)
python -m http.server 8080
npx serve .
```

مرورگر را در `http://localhost:8080` باز کنید.

برای تجربه کامل PWA، از HTTPS استفاده کنید (GitHub Pages، Vercel، یا localhost).

### توسعه

```bash
npm test
```

تست‌ها با `node:test` اجرا می‌شوند — بدون نیاز به فریمورک خارجی.

## ساختار پروژه

```
├── index.html                   # پوسته اصلی + آیکون‌های SVG
├── manifest.webmanifest          # مانیفست PWA
├── service-worker.js             # سرویس ورکر آفلاین
├── package.json                  # اسکریپت تست
├── css/
│   ├── variables.css             # رنگ‌ها، فاصله‌ها، تم‌ها
│   ├── base.css                  # ریست، تایپوگرافی، RTL
│   └── components.css            # استایل کامپوننت‌ها
├── js/
│   ├── app.js                    # بوت‌استرپ + رندر + رویدادها
│   ├── state/
│   │   ├── store.js              # state درون حافظه + ذخیره‌سازی
│   │   └── schema.js             # مدل داده + مهاجرت
│   ├── storage/
│   │   ├── localStorageAdapter.js
│   │   └── cookieAdapter.js
│   └── utils/
│       ├── currency.js           # فرمت‌دهی، گردکردن، واحد
│       ├── date.js               # تبدیل شمسی و میلادی
│       ├── i18n.js               # ترجمه فارسی و انگلیسی
│       ├── settlementEngine.js   # الگوریتم تسویه
│       └── validators.js         # اعتبارسنجی
├── assets/
│   ├── fonts/                    # وزیرمتن woff2
│   ├── icons/                    # آیکون‌های PWA
│   └── vendors/jalalidatepicker/ # انتخاب تاریخ شمسی
└── tests/
    ├── settlementEngine.test.js
    ├── storage.test.js
    └── utils.test.js
```

## مدل داده

- **سفر (Trip)** — کانتینر اصلی با تقویم، ارز، خانواده‌ها و هزینه‌ها
- **خانواده (Family)** — گروهی از افراد با رنگ اختصاصی
- **نفر (Member)** — شخص متعلق به یک خانواده
- **هزینه (Expense)** — آیتم هزینه با شرکت‌کنندگان، مالیات، خرج‌ها و وزن سهم
- **خرج (Charge)** — خط پرداخت مجزا (مبلغ + پرداخت‌کننده)

همه مبالغ به صورت اعداد صحیح در واحد جزء ذخیره می‌شوند (تومان کامل / سنت برای دلار و یورو).

## مجوز

MIT

</div>
