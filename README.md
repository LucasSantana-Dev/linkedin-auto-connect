# LinkedIn Engage

A Chrome Extension for automating LinkedIn networking — connection requests, company follows, feed engagement, and job applications.

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/media/popup-connect.png" width="240" alt="Connect mode"/><br/><sub>Connect mode</sub></td>
    <td align="center"><img src="docs/media/popup-companies.png" width="240" alt="Companies mode"/><br/><sub>Companies mode</sub></td>
    <td align="center"><img src="docs/media/popup-feed.png" width="240" alt="Feed mode"/><br/><sub>Feed mode</sub></td>
    <td align="center"><img src="docs/media/popup-jobs.png" width="240" alt="Jobs mode"/><br/><sub>Jobs mode</sub></td>
  </tr>
</table>

<img src="docs/media/dashboard.png" width="900" alt="Dashboard — activity stats and charts"/>

---

## What it does

| Mode | What it automates |
|------|-------------------|
| **Connect** | Searches LinkedIn, scores profiles, sends personalized invites with area-aware note templates |
| **Companies** | Follows target companies by query or explicit list, with preset queues for creative/tech industries |
| **Jobs** | Ranks Easy Apply listings by fit, pre-fills forms from an encrypted local profile cache, stops before submit |
| **Feed** | Reacts and comments on posts using category-aware templates and thread-context mirroring |

Key features across all modes: Boolean search builder with EN/PT-BR locale support, scheduled recurring runs, weekly quota guard, CAPTCHA detection, and a dashboard with activity charts and skip-reason insights.

---

## Installation

> **Requirements:** Google Chrome or Brave (desktop). No build step.

### Step 1 — Download the extension

Go to the [Releases page](https://github.com/LucasSantana-Dev/linkedin-engage/releases), download the latest `linkedin-engage-vX.Y.Z.zip`, and extract it anywhere on your computer.

### Step 2 — Open the Extensions page

Type `brave://extensions` (Brave) or `chrome://extensions` (Chrome) in your address bar.

<img src="docs/media/install-step2-extensions-page.png" width="700" alt="Brave Extensions page"/>

### Step 3 — Enable Developer Mode, then load the extension

Toggle **Developer mode** on (top-right corner). Three buttons appear — click **Load unpacked** and select the extracted folder (the one containing `manifest.json`).

<img src="docs/media/install-step3-developer-mode.png" width="700" alt="Developer mode ON — Load unpacked button visible"/>

### Step 4 — Pin it and start

Click the puzzle piece icon in the toolbar, pin **LinkedIn Engage**, then open [linkedin.com](https://www.linkedin.com) and click the extension icon to open the popup.

<img src="docs/media/install-extensions-page.png" width="700" alt="Extension loaded and enabled"/>

---

## Updating

Download the new zip from the [Releases page](https://github.com/LucasSantana-Dev/linkedin-engage/releases), replace the old folder, then go to `brave://extensions` / `chrome://extensions` and click the reload button (↻) on the LinkedIn Engage card.

---

## Standalone Playwright connector

```bash
git clone https://github.com/LucasSantana-Dev/linkedin-engage.git
cd linkedin-engage && npm install
node linkedin-connector.js          # opens browser for first-time login
curl -X POST http://localhost:3000/api/linkedin/connect
```

Import `n8n-linkedin-workflow.json` into n8n for scheduled webhook-triggered runs.

---

## Responsible use

- **50–100 requests/day max** — built-in delays and human-timing guardrails apply automatically
- **Weekly invite cap** — enforced at 150; the extension stops and notifies when the limit is hit
- **Jobs mode requires manual final submit** — review each application before submitting
- **Auto-backoff on 429s** — pauses 30 s → 60 s → 120 s after consecutive failures

Use in accordance with [LinkedIn's Terms of Service](https://www.linkedin.com/legal/user-agreement). Excessive automation may result in account restrictions.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full feature and fix history.

## License

[MIT](LICENSE)
