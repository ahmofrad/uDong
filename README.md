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
<h1>دنگ حساب سفر</h1>
<blockquote>یک PWA کاملاً آفلاین که هزینه‌های مشترک سفر را بین <strong>خانواده‌ها</strong> تقسیم کرده و تسویه نهایی را نمایش می‌دهد.</blockquote>
<hr>
<h2>قابلیت‌ها</h2>
<ul>
<li><strong>مدیریت چند سفر</strong> — ایجاد، بایگانی و جابجایی بین سفرها</li>
<li><strong>تعریف خانواده و نفرات</strong> — تعریف خانواده‌ها با رنگ اختصاصی</li>
<li><strong>ثبت هزینه</strong> — ثبت هزینه با دسته‌بندی، مالیات و سهم‌بندی</li>
<li><strong>سهم‌بندی نابرابر</strong> — قفل کردن سهم هر نفر برای تقسیم دلخواه</li>
<li><strong>چند پرداخت‌کننده</strong> — هر هزینه می‌تواند چند پرداخت‌کننده داشته باشد</li>
<li><strong>الگوریتم تسویه</strong> — محاسبه تسویه نهایی بین خانواده‌ها با حداقل تعداد تراکنش</li>
<li><strong>رابط کاربری دو زبانه</strong> — فارسی و انگلیسی</li>
<li><strong>تقویم شمسی و میلادی</strong> — انتخاب تقویم برای هر سفر</li>
<li><strong>چند ارز</strong> — پشتیبانی از تومان، دلار و یورو</li>
<li><strong>حالت تاریک</strong> — قابلیت تغییر به حالت تاریک و روشن</li>
<li><strong>ارقام فارسی</strong> — نمایش اعداد به صورت فارسی یا لاتین</li>
<li><strong>آفلاین</strong> — کارکرد کامل بدون نیاز به اینترنت</li>
<li><strong>خروجی و ورودی JSON</strong> — پشتیبان‌گیری از اطلاعات</li>
<li><strong>نسخه قابل چاپ تسویه</strong> — مشاهده و چاپ تسویه نهایی</li>
<li><strong>جستجو و فیلتر</strong> — پیدا کردن هزینه‌ها بر اساس عنوان یا دسته</li>
</ul>
<h2>تکنولوژی</h2>
<ul>
<li>‏<strong>HTML5 + CSS3 + JavaScript (ES2022, ES Modules)</strong> — بدون فریمورک و بدون build step</li>
<li><strong>فونت وزیرمتن</strong> — میزبانی شده در پروژه، بدون نیاز به CDN</li>
<li><strong>آیکون‌های SVG درون‌ساختی</strong> — bundled در index.html</li>
<li>‏<strong>localStorage</strong> برای داده سفرها + <strong>Cookies</strong> برای تنظیمات</li>
<li>‏<strong>Service Worker</strong> — استراتژی آفلاین cache-first</li>
<li><strong>۴۵ تست واحد</strong> با <code>node:test</code></li>
</ul>
<h2>شروع کار</h2>
<p>برنامه یک سایت استاتیک است و نیازی به build ندارد:</p>
<pre><code>npm test
python -m http.server 8080
npx serve .
</code></pre>
<p>مرورگر را در <code>http://localhost:8080</code> باز کنید.</p>
<p>برای تجربه کامل PWA، از HTTPS استفاده کنید (GitHub Pages، Vercel، یا localhost).</p>
<h3>توسعه</h3>
<pre><code>npm test
</code></pre>
<p>تست‌ها با <code>node:test</code> اجرا می‌شوند — بدون نیاز به فریمورک خارجی.</p>
<h2>ساختار پروژه</h2>
<pre><code>├── index.html                   # پوسته اصلی + آیکون‌های SVG
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
</code></pre>
<h2>مدل داده</h2>
<ul>
<li><strong>سفر (Trip)</strong> — کانتینر اصلی با تقویم، ارز، خانواده‌ها و هزینه‌ها</li>
<li><strong>خانواده (Family)</strong> — گروهی از افراد با رنگ اختصاصی</li>
<li><strong>نفر (Member)</strong> — شخص متعلق به یک خانواده</li>
<li><strong>هزینه (Expense)</strong> — آیتم هزینه با شرکت‌کنندگان، مالیات، خرج‌ها و وزن سهم</li>
<li><strong>خرج (Charge)</strong> — خط پرداخت مجزا (مبلغ + پرداخت‌کننده)</li>
</ul>
<p>همه مبالغ به صورت اعداد صحیح در واحد جزء ذخیره می‌شوند (تومان کامل / سنت برای دلار و یورو).</p>
<h2>مجوز</h2>
<p>MIT</p>
</div>
