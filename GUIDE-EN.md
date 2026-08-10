# Complete Guide — Alzahraa General Contracting Employee Portal

**Written for someone with zero coding knowledge.** Don't skip steps; read in order.

---

## Contents

1. [What you actually received](#1)
2. [Try it right now (30 seconds, no internet)](#2)
3. [Demo login accounts](#3)
4. [Tour of the system](#4)
5. [How the approval route works (the most important idea)](#5)
6. [Publishing on the internet with GitHub — step by step](#6)
7. [Connecting your own domain](#7)
8. [How to edit the site](#8)
9. [How to publish your edits](#9)
10. [Backups — read this twice](#10)
11. [Real limits of demo mode — very important](#11)
12. [Moving to a real database (phase two)](#12)
13. [Publishing to the App Store & Google Play](#13)
14. [Expected costs](#14)
15. [Security & privacy](#15)
16. [Troubleshooting](#16)
17. [Glossary](#17)
18. [Suggested roadmap](#18)

---

<a name="1"></a>
## 1. What you actually received

A folder called **`alzahraa-portal`** containing a complete, working website:

```
alzahraa-portal/
├── index.html              ← the starting file. This IS the website
├── manifest.webmanifest    ← lets it install as a phone app
├── .nojekyll               ← empty file GitHub needs (don't delete)
├── GUIDE-AR.md             ← Arabic version of this guide
├── GUIDE-EN.md             ← this guide
├── README.md               ← quick summary
└── assets/
    ├── css/styles.css      ← all colours, fonts and styling
    ├── img/                ← icons
    └── js/                 ← the "brain"
        ├── i18n.js         ← every word, in Arabic and English
        ├── schema.js       ← ⭐ defines every screen and field (your key file)
        ├── store.js        ← data storage
        ├── auth.js         ← users, roles, permissions
        ├── workflow.js     ← approval route (originator → reviewer → approver)
        ├── seed.js         ← demo data
        ├── ui.js           ← buttons, tables, dialogs
        ├── app.js          ← menu and navigation
        └── pages/          ← dashboard, approvals, reports, settings
```

### What's inside

**35 full working screens** across three department groups:

| Group | Screens |
|---|---|
| **Finance, Procurement & Stores** (16) | Chart of accounts, journal entries, suppliers, customers, cost items, purchase approvals, goods receipt & inspection, supplier invoices, payment vouchers, receipt vouchers, cash & bank accounts, items master, warehouses, stock issues, stock transfers, stock counts |
| **Projects & Technical Office** (11) | Projects, project budgets, client contracts, client IPCs, subcontractors, subcontracts, subcontractor IPCs, drawings & technical office, daily site reports, equipment & fleet, equipment usage & maintenance |
| **HR & Administration** (8) | Employees, attendance, leave requests, payroll runs, legal affairs, IT assets, IT support tickets, announcements |

**Plus:** a dashboard with charts, an approvals inbox, 10 reports, settings, a full audit log, 13 job roles, one-click Arabic/English, dark mode, Excel export, printing, and backup/restore.

**Built directly from the SRS document you provided** — same document route, same segregation of duties, same reverse-don't-delete rule, same cost structure.

---

<a name="2"></a>
## 2. Try it right now (30 seconds, no internet)

1. Open the `alzahraa-portal` folder.
2. **Double-click `index.html`.**
3. It opens in your browser.
4. Username `admin`, password `1234` — or click any grey button at the bottom for instant login.

**Done. It works.** No internet, no server, nothing to install.

> **Note:** the dashboard charts load from an online library, so they need internet. Everything else works fully offline.

---

<a name="3"></a>
## 3. Demo login accounts

**Password for every account: `1234`**

| Username | Name | Role | What they can do |
|---|---|---|---|
| `admin` | Mohamed Zidan | System administrator | Everything + user management |
| `gm` | Eng. Ahmed Alzahraa | General manager | Full visibility + final approval |
| `finance` | Sami Abdullah | Finance manager | Approves financial documents, all reports |
| `accountant` | Marwa Hassan | Accountant | Enters journals, invoices, vouchers (cannot approve) |
| `purchase` | Karim Fouad | Procurement officer | Purchase approvals, suppliers |
| `store` | Ramadan El-Sayed | Storekeeper | Receipts, issues, transfers, counts |
| `pm` | Eng. Tarek Mansour | Project manager | Project cost, IPCs, site reports |
| `technical` | Eng. Nourhan Salah | Technical office | Drawings, budgets, quantity surveying |
| `hr` | Hala Mostafa | Human resources | Employees, attendance, leave, payroll |
| `legal` | Amr El-Shennawy | Legal affairs | Contracts, licences, cases |
| `it` | Youssef Adel | IT officer | IT assets and support tickets |
| `auditor` | Ehab Rashed | Internal auditor | **Read-only** — sees everything, changes nothing |
| `employee` | Salma Ibrahim | Employee | Announcements + submit leave/IT requests only |

**Try this to see the point of the system:** sign in as `purchase`, create a purchase approval, submit it. Sign out, sign in as `pm` — it's in the Approvals inbox. Review it. Sign out, sign in as `finance` — approve it. Then try to review a document you created yourself: the system will refuse.

---

<a name="4"></a>
## 4. Tour of the system

**Sidebar** — grouped by department. What you see depends on your role: an ordinary employee sees 5 screens, an administrator sees 35.

**Top bar** — quick search (or `Ctrl + K` anywhere), approvals inbox with a red counter, dark mode, language switch, user menu (profile, settings, backup, restore, sign out).

**Every screen** has: a **New** button, instant search, status filter chips, a sortable paginated table, **Export to Excel**, **Print**, and per-row actions (view · edit · duplicate · delete).

**Forms** are grouped into sections. Required fields carry a red star. Documents with line items (purchase approvals, IPCs, journals, payroll…) have a **line editor** that calculates line totals, subtotal, tax and grand total live as you type.

**Dashboard** — 8 KPIs (active projects, budgets, actual cost, commitments, receivables, payables, inventory value, pending documents), automatic alerts (over-budget projects, items below reorder level, expiring contracts and licences), two charts, a project status table, latest documents, and quick actions.

**Reports (10)** — Budget vs actual · Detailed project cost · Stock balances · Supplier ageing · Customer ageing · Cash & bank movement · Trial balance · Subcontractor IPCs · Payroll summary · Attendance summary. All filterable by date and project, all exportable and printable.

---

<a name="5"></a>
## 5. How the approval route works

```
Draft ──submit──▶ Pending review ──review──▶ Reviewed ──approve──▶ Approved
                       │                        │                     │
                       ├──return──▶ Returned ◀──┤                     │
                       └──reject──▶ Rejected ◀──┘                     │
                                                                      └──reverse──▶ Reversed
```

### Rules enforced in code — impossible to bypass:

1. **Whoever creates a document can never review it** — even holding the reviewer role.
2. **Whoever reviews it can never approve it** — even holding the approver role.
3. **Rejecting or returning always requires a written reason.**
4. **A submitted document is locked** and cannot be edited until formally returned.
5. **An approved document is never deleted.** The only correction is **Reverse**: the system creates a mirror document with negated values linked to the original, and the original stays on record marked *Reversed*.
6. **Every step is recorded** with name, date, time and reason — visible in the document's approval trail and in the global Audit log.

---

<a name="6"></a>
## 6. Publishing on the internet with GitHub

**Result:** a link like `https://yourname.github.io/alzahraa-portal/` that opens from anywhere in the world. **Free forever.**

### What is GitHub?
A free site for storing website files. Its **GitHub Pages** service turns your files into a real live website. That's all you need to understand.

---

### Step 1 — Create an account (3 minutes)

1. Go to **github.com** → **Sign up**
2. Enter your email → **Continue**
3. Choose a strong password → **Continue**
4. Choose a username — **it appears in your website link**, so pick carefully (e.g. `alzahraa-contracting`) → **Continue**
5. Solve the puzzle → **Create account**
6. Enter the 8-digit code sent to your email.
7. If asked about a plan, choose **Free**.

---

### Step 2 — Create a repository (2 minutes)

A repository is a folder on the internet holding your website files.

1. Top right **+** → **New repository**
2. **Repository name:** `alzahraa-portal` (no spaces, lowercase)
3. Choose **Public** — anyone can read the code, and Pages works free. *(Private repositories need a paid plan (~$4/month) for Pages. Choose Public: there are no secrets in the code, and your data never lives inside it.)*
4. **Do not tick** "Add a README file" or any other option.
5. **Create repository**

---

### Step 3 — Upload the files (5 minutes)

On the next page ignore all the commands. Find the line *"…or **uploading an existing file**"* and click it.

Now the critical part:

1. Open the `alzahraa-portal` folder on your computer.
2. **Select everything inside it** (`Ctrl+A` / `Cmd+A`): `index.html`, `manifest.webmanifest`, `.nojekyll`, the three `.md` files, and the **`assets` folder**.
3. **Drag them** into the dotted box on GitHub.

> ⚠️ **The most common mistake:** dragging the `alzahraa-portal` folder itself instead of its contents. You'd end up with `.../alzahraa-portal/alzahraa-portal/` and a 404 page. **Go inside the folder first**, then select and drag what's inside.

> ⚠️ **`.nojekyll` starts with a dot so it may be hidden.**
> **Windows:** File Explorer → `View` tab → tick `Hidden items`.
> **Mac:** press `Cmd + Shift + .`
> If you still can't find it, upload everything else, then on GitHub click **Add file → Create new file**, name it `.nojekyll`, leave it empty, and commit.

4. Wait for all files to finish uploading.
5. In **Commit changes** type `first version` → click the green **Commit changes**.

---

### Step 4 — Turn on GitHub Pages (2 minutes)

1. **Settings** tab (⚙️) at the top of the repository.
2. **Pages** in the left menu.
3. **Source:** *Deploy from a branch*
4. **Branch:** `main` and `/ (root)`
5. **Save**

---

### Step 5 — Wait, then open your site (1–5 minutes)

Stay on the Pages screen and refresh every minute. A green box appears:

> ✅ **Your site is live at** `https://yourname.github.io/alzahraa-portal/`

Click it. **Your site is on the internet.**

> ⏳ The very first deploy can take up to 10 minutes. A 404 at first is normal — wait and refresh.

### Step 6 — Share it

Send the link to staff. It works on any device. On phones they can install it:
- **Android (Chrome):** menu ⋮ → *Add to Home screen*
- **iPhone (Safari):** share button ⬆️ → *Add to Home Screen*

It then gets an icon and opens full-screen like a real app.

---

<a name="7"></a>
## 7. Connecting your own domain

1. Buy a domain from **Namecheap**, **GoDaddy** or **Cloudflare** (~**$10–15/year**).
2. In your provider's **DNS settings**, add a **CNAME** record:
   - **Name/Host:** `portal`
   - **Value/Target:** `yourname.github.io`
3. GitHub → **Settings** → **Pages** → **Custom domain** → type `portal.yourcompany.com` → **Save**
4. Wait 15 minutes to 24 hours.
5. When available, tick **Enforce HTTPS**.

---

<a name="8"></a>
## 8. How to edit the site

### Two ways

**A — Directly on GitHub (easiest, no software):** open the file on github.com → pencil icon ✏️ → edit → **Commit changes** → live in about a minute.

**B — On your computer (better for bigger changes):** edit with **VS Code** (free, `code.visualstudio.com`), test by opening `index.html`, then re-upload as in [section 9](#9).

---

### Edit 1: Company details
No code needed. Sign in as `admin` → **Settings** → **Company profile** → edit → **Save**.

For the name on the login screen and sidebar, open `assets/js/i18n.js`:
```javascript
'app.name': 'شركة الزهراء للمقاولات العامة',
'app.short': 'الزهراء للمقاولات',
```
and the matching keys in the `en:` section.

### Edit 2: Colours
`assets/css/styles.css`, first 20 lines:
```css
--green-800:#0b3d2e;   /* primary dark */
--green-700:#12543f;   /* buttons */
--gold-500:#c9a227;    /* accent */
```
Pick colours at `htmlcolorcodes.com`. Changes apply site-wide instantly.

### Edit 3: Logo
Put `logo.png` (transparent background) in `assets/img/`, then in `index.html` replace each `<svg viewBox="0 0 64 64" …>…</svg>` block (there are two) with:
```html
<img src="assets/img/logo.png" alt="Company logo" width="52">
```

---

### Edit 4: Add a field to an existing screen ⭐

The edit you'll need most. Example — add "PO number" to purchase approvals.

Open `assets/js/schema.js`, find `id: 'purchaseApprovals'`, and inside its `fields:` array add:

```javascript
F('poNumber', 'رقم أمر التوريد', 'PO number', 'text', { section: SEC.main }),
```

| Part | Meaning |
|---|---|
| `'poNumber'` | internal name — English, no spaces, unique in the screen |
| `'رقم أمر التوريد'` | Arabic label the user sees |
| `'PO number'` | English label |
| `'text'` | field type |
| `{ section: SEC.main }` | which form section it appears in |

**Field types:** `text` `textarea` `number` `money` `percent` `date` `select` `ref` `checkbox` `email` `phone` `calc`

**Options:** `required: true` · `full: true` (full width) · `default: 'today'` · `readonly: true` · `help: {ar:'…', en:'…'}`

**A dropdown:**
```javascript
F('urgency', 'درجة الاستعجال', 'Urgency', 'select', {
  section: SEC.main,
  options: [
    { value: 'low',  label: { ar: 'منخفضة', en: 'Low' } },
    { value: 'high', label: { ar: 'عالية',  en: 'High' } }
  ]
}),
```

**A link to another screen:**
```javascript
F('engineer', 'المهندس المسؤول', 'Responsible engineer', 'ref',
  { ref: 'employees', refLabel: 'name', section: SEC.main }),
```

**To show it in the table**, add the name to that screen's `columns` array.

That's it — form, table, search, export and permissions all update automatically.

---

### Edit 5: Add a whole new screen

In `schema.js`, just before the `];` that closes `var MODULES`, add:

```javascript
,{
  id: 'hse', table: 'hse', group: 'projects', icon: 'alert',
  label: { ar: 'السلامة والصحة المهنية', en: 'Health & Safety' },
  desc: { ar: 'بلاغات وحوادث وتفتيش السلامة', en: 'Incidents and safety inspections' },
  docPrefix: 'HSE',
  search: ['docNo', 'title'],
  columns: ['docNo', 'date', 'project', 'severity', 'title'],
  fields: [
    F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
    F('title', 'الموضوع', 'Subject', 'text', { required: true, section: SEC.main, full: true }),
    F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', required: true, section: SEC.main }),
    F('severity', 'درجة الخطورة', 'Severity', 'select', {
      required: true, section: SEC.main, options: [
        { value: 'near',  label: { ar: 'حادث وشيك', en: 'Near miss' } },
        { value: 'minor', label: { ar: 'إصابة بسيطة', en: 'Minor injury' } },
        { value: 'major', label: { ar: 'إصابة بليغة', en: 'Major injury' } }
      ]
    }),
    F('description', 'الوصف', 'Description', 'textarea', { required: true, section: SEC.main, full: true }),
    F('action', 'الإجراء المتخذ', 'Corrective action', 'textarea', { section: SEC.extra, full: true })
  ]
}
```

Then in `assets/js/auth.js` grant roles access, e.g. inside `project_manager`:
```javascript
hse: ['view', 'create', 'edit', 'delete'],
```

Add `workflow: true` to put the screen on the approval route. `group` can be `finance`, `projects` or `people`.

### Edit 6: Users and permissions
Sign in as `admin` → **Settings** → **Users & permissions** → **New**. To change a whole role's rights, edit its `perms` in `assets/js/auth.js`. Actions: `view`, `create`, `edit`, `delete`, `review`, `approve`.

### Edit 7: Any wording
Everything lives in `assets/js/i18n.js` — change the Arabic and its English counterpart.

---

<a name="9"></a>
## 9. How to publish your edits

**Edited on GitHub?** Nothing more — **Commit changes** publishes within about a minute.

**Edited on your computer?**
1. Open your repository → navigate into the folder (e.g. `assets` → `js`)
2. **Add file** → **Upload files**
3. Drag the new file in — same filename replaces the old one automatically
4. **Commit changes** → wait a minute → refresh

> 💡 Not seeing the change? Press `Ctrl + Shift + R` (`Cmd + Shift + R` on Mac) for a hard refresh.

**Undoing a bad edit:** GitHub keeps every previous version forever. Click the **Commits** tab (🕐), pick a working version, **Browse files**, and copy the old content back. You can never truly lose anything.

---

<a name="10"></a>
## 10. Backups — read this twice

### 🔴 The single most important fact in this guide

In demo mode, **data is stored inside each user's own browser, on their own device.** It is not online and it is not shared.

That means:
- What the accountant enters is **invisible** to the project manager.
- Clearing browsing data = **all data gone**.
- Different device or browser = starting from zero.
- Incognito mode = data disappears when the window closes.
- Storage is capped at about **5 MB** (thousands of text records — but not files or photos).

**Take a backup:** user menu → **Backup (download)** → saves `alzahraa-backup-YYYY-MM-DD.json`.
**Restore:** user menu → **Restore backup** → pick the file.

> 📌 **Golden rule: back up every working day and keep it on Google Drive, OneDrive, or your email.**

Until phase two, a workable stopgap is: one person enters data, backs up at day's end, and sends the file to others to restore. It's clumsy — which is exactly why phase two matters.

---

<a name="11"></a>
## 11. Real limits of demo mode

### ✅ Excellent for
- **Showing management** the system and getting design sign-off.
- **Training staff** on screens and the approval route before go-live.
- **Testing the logic**: are the fields enough? are these the right reports?
- **A living specification** to hand a developer — far better than a paper spec.

### ❌ Not suitable for
- **Real financial data** anyone will rely on.
- **Multiple people working together** — there is no synchronisation at all.
- **Security** — passwords are plain text in the code; anyone competent can read them and change data in their browser.
- **File attachments** — you can store a link to a Drive file, not the file itself.
- **Official tax invoices** or e-invoicing integration.

### 💬 How to explain it to management
> "This is a complete working prototype of the final system: every screen, every field, the approval route and the reports. We use it to sign off the design and train the team. Phase two connects it to a real database so everyone works on the same data at the same time, securely."

---

<a name="12"></a>
## 12. Moving to a real database (phase two)

### Why
So all staff work on **the same data simultaneously**, passwords are **encrypted**, data sits on a server with **automatic backups**, and **real attachments** can be uploaded.

### Recommended: **Supabase** — a ready-made online database, **free** up to 500 MB (years of headroom for a company your size).

### 🎁 The good news
**The system was written for this from day one.** All data access flows through a single file, `assets/js/store.js`, which already contains a commented-out `SupabaseAdapter` skeleton. Only the storage engine gets swapped — **no screen, field or report changes.**

### Steps (for you or your developer)
1. Create a free project at **supabase.com**.
2. In **Table Editor**, create one table per `table` name in `schema.js` (37 tables), with columns matching each field's `name`.
3. In **Authentication**, enable email sign-in and create staff accounts.
4. **Settings → API**: copy `Project URL` and `anon public key`.
5. In `index.html`, before the other scripts:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
6. In `store.js`, uncomment the `SupabaseAdapter` block, then replace
   `var adapter = LocalAdapter;` with:
   ```javascript
   var adapter = SupabaseAdapter;
   SupabaseAdapter.connect('YOUR_URL', 'YOUR_ANON_KEY');
   ```
7. Enable **Row Level Security** in Supabase so permissions are enforced by the database itself. This is essential for genuine security.

### ⏱ Realistic estimate
A competent developer finishes this in **3–7 working days** (roughly **EGP 15,000–40,000** in the Egyptian market). Far cheaper than building from scratch, because **90% of the work is already done**.

---

<a name="13"></a>
## 13. Publishing to the App Store & Google Play

### Option 1: PWA — **free, instant, and what I recommend now** ⭐

The site is **already configured** for this. Staff open the link and add it to their home screen: icon, full-screen, app-like.

| | |
|---|---|
| Cost | zero |
| Time | 30 seconds per employee |
| Advantage | updates reach everyone instantly — no store review |
| Drawback | not listed in stores; limited iOS notifications |

**For internal company use this is simply the right answer.**

---

### Option 2: Real store apps

Wrap the site with **Capacitor** or a service like **Median.co**.

**Google Play:** $25 one-time developer fee · wrapping takes about a day · you need an icon, screenshots, description and a **publicly hosted privacy policy** · review takes 1–7 days · ⚠️ Google scrutinises "just a wrapped website" apps and may reject them unless they use a real native feature (notifications, camera for document photos, offline mode).

**Apple App Store:** $99 **per year** · you need a **Mac** to build and submit · review is stricter and rejection of wrapped sites is common (guideline 4.2) · review takes 2 days to 2 weeks, often with rejections.

**Smarter internal alternative:** for staff-only use, skip the stores entirely — generate an `.apk` and distribute it directly on Android (free), and use the PWA on iPhone (practically identical result).

### 💡 Honest advice
**Don't think about the stores at all right now.** Publish on GitHub Pages, have staff install the PWA, and put your energy into phase two. Revisit stores after a year of real use, if a genuine need appears.

---

<a name="14"></a>
## 14. Expected costs

| Item | Cost | Required? |
|---|---|---|
| GitHub account | **Free** | ✅ |
| GitHub Pages hosting | **Free forever** | ✅ |
| HTTPS certificate 🔒 | **Free** (automatic) | ✅ |
| Custom domain | $10–15/year | ❌ optional |
| Private repo + Pages | ~$4/month | ❌ optional |
| Supabase database | **Free** to 500 MB, then $25/month | ⚠️ phase two |
| Phase-two development | EGP 15,000–40,000 one-off | ⚠️ for real use |
| Google Play | $25 one-time | ❌ optional |
| Apple App Store | $99/year | ❌ optional |

**To start today: zero.**

---

<a name="15"></a>
## 15. Security & privacy

### 🔴 Know this immediately
1. **Passwords are exposed** — plain text in `seed.js`. Anyone opening your site can read them. Changing them doesn't help; they'd be exposed too.
2. **There is no real security.** Permissions organise work and prevent mistakes; they do not stop someone who knows what they're doing.
3. **The code is public** — normal and safe, *as long as no real data lives inside it*.

### ✅ Non-negotiable rules for now
- **No real financial data** before phase two.
- **No real national IDs, salaries or bank account numbers** in the demo data.
- **Never reuse a real password** you use elsewhere.
- If you need a realistic demo with real names for management, run it **locally on your own machine** and don't upload it.

### 🛡 After phase two
Hashed passwords, database-level permissions (RLS), secure sessions with expiry, automatic backups, and a tamper-proof audit log.

---

<a name="16"></a>
## 16. Troubleshooting

| Problem | Cause & fix |
|---|---|
| **404 after publishing** | (1) Wait 5 minutes. (2) You uploaded the folder instead of its contents — `index.html` must appear on the repository's **front page**. (3) Pages source isn't set to `main` + `/(root)`. |
| **Completely blank page** | A file in `assets` didn't upload. Check `assets/js/` has 13 files and `assets/css/styles.css` exists. |
| **Edit not showing** | Browser cache. `Ctrl+Shift+R`, or wait 2 minutes. |
| **Charts missing** | No internet, or no approved data yet. The rest works normally. |
| **"Storage is full"** | Back up, delete old records, or move to phase two. |
| **Data disappeared** | Browser data was cleared, or you're on a different device/browser. Restore your backup. |
| **Text looks scrambled** | Update to a current browser (Chrome, Edge, Safari, Firefox). |
| **Can't approve a document** | Intentional — you created or reviewed it (segregation of duties), or your role lacks approval rights. |
| **A screen is missing from the menu** | Your role has no access. Sign in as `admin` and adjust permissions. |
| **Excel shows Arabic as symbols** | Files include a BOM and normally open fine. If not: Excel → Data → From Text → choose UTF-8. |

---

<a name="17"></a>
## 17. Glossary

| Term | Plain meaning |
|---|---|
| **HTML** | the structure of a web page |
| **CSS** | the styling — colours, fonts, layout |
| **JavaScript** | the logic — calculations and buttons |
| **Repository** | your project folder on GitHub |
| **Commit** | saving a version of your changes, with a date and description |
| **Deploy** | making the site live on the internet |
| **GitHub Pages** | GitHub's free website hosting |
| **Domain** | your web address, e.g. `alzahraa.com` |
| **DNS** | the directory linking a domain to where files live |
| **HTTPS 🔒** | an encrypted, secure connection |
| **localStorage** | a small store inside the browser — where your data lives now |
| **Backend** | the server and database (not present yet) |
| **Supabase** | a ready-made, free database service |
| **PWA** | a website installable as a phone app |
| **API** | how two programs talk to each other |
| **Cache** | a saved copy in the browser for faster loading |
| **RLS** | permissions enforced inside the database itself |

---

<a name="18"></a>
## 18. Suggested roadmap

**Week 1 — Publish & approve.** Deploy to GitHub Pages · test every screen in every role · demo to management · collect written feedback.

**Weeks 2–3 — Customise.** Adjust screens and fields · enter your real master data (projects, suppliers, items, chart of accounts) · delete the demo records · **take a backup**.

**Week 4 — Train.** Train each employee on their screens · run a full dry cycle: purchase approval → receipt → invoice → payment · sign off the final design in writing.

**Months 2–3 — Phase two.** Hire a developer to connect Supabase (hand them this guide and the code) · pilot on one project · then roll out to all.

**After 6 months — Expand.** Real attachments · e-invoicing (ETA) · email alerts · advanced dashboards · a mobile app if a genuine need appears.

---

## ✅ Quick checklist

- [ ] Opened `index.html` and tried it locally
- [ ] Signed in with at least 3 different roles
- [ ] Ran a full approval cycle (create → review → approve)
- [ ] Created a GitHub account
- [ ] Created the `alzahraa-portal` repository
- [ ] Uploaded the folder's **contents** (not the folder itself)
- [ ] Enabled GitHub Pages in Settings → Pages
- [ ] Opened the live link ✅
- [ ] Installed it on my phone as an app
- [ ] Took my first backup
- [ ] Read the [Limits](#11) and [Security](#15) sections and understand it isn't for real data yet

---

**A complete system, entirely yours, with no subscriptions and no lock-in. Good luck. 🏗️**
