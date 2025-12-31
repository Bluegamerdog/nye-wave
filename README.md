# NYE Timezone Wave

A minimal, client-side web app that visualizes how the New Year rolls across the world - showing each timezone crossing midnight in order, live.

The site automatically targets the **next upcoming New Year** and updates itself every second.

---

## ✨ Features

- 🌍 Shows every IANA timezone crossing into the New Year in chronological order
- ⏱ Live countdowns per timezone
- 🔁 Optional grouping of zones that flip at the same moment
- 🔎 Filter timezones by name (e.g. `Berlin`, `Pacific`, `UTC`)
- 📊 Live progress indicator (`X / Y crossed into YYYY`)
- 🧠 Fully client-side (no backend, no APIs)
- 🔐 Strong CSP & no third-party JS at runtime

---

## 🔐 Security

* No backend
* No user data
* No cookies
* No analytics
* Self-hosted dependencies only
* Strict `Content-Security-Policy` via `_headers`

This makes the attack surface (hopefully) extremely small.

---

## 🛠 Tech Stack

* HTML / CSS / Vanilla JS
* [Luxon](https://moment.github.io/luxon/) (self-hosted)
* Browser `Intl` API for timezone data
* Cloudflare Pages (hosting)