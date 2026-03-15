---
name: extension-i18n-search-l10n
description: Localize the LinkedIn Engage extension UI and search-query generation without mixing user-facing UI language with automation/search language.
metadata:
  owner: linkedin-engage
  tier: project
---

# Extension I18n + Search L10n

Use this skill when changing popup/options/dashboard copy, notifications, search templates, or search-query generation.

## Rules

1. Never ship inline bilingual UI copy.
2. UI locale and search locale are separate concerns.
3. Canonical internal enums, statuses, reasons, analytics keys, and machine-readable contracts stay English.
4. Every new user-facing string must go through locale keys.
5. New search templates must define localized term variants, not only English literals.
6. Chrome `_locales/*/messages.json` keys must use only `[A-Za-z0-9_]`.
7. Keep dotted logical keys in code and normalize them to underscore catalog keys at the i18n helper boundary.
8. Never read locale JSON directly with dotted keys; always go through `extension/lib/i18n.js`.

## Architecture

### Locale catalogs

| File | Purpose |
|---|---|
| `extension/_locales/en/messages.json` | English UI strings |
| `extension/_locales/pt_BR/messages.json` | Brazilian Portuguese UI strings |

### Core modules

| Module | Purpose |
|---|---|
| `extension/lib/i18n.js` | Locale catalog loader, key normalization, `getMessage`, `applyTranslations` |
| `extension/lib/search-language.js` | Per-mode search locale resolution (`auto`/`en`/`pt_BR`/`bilingual`) |
| `extension/lib/search-templates.js` | Boolean query compiler with localized term dictionaries |

### DOM translation attributes

| Attribute | What it translates |
|---|---|
| `data-i18n` | `textContent` |
| `data-i18n-placeholder` | `placeholder` attribute |
| `data-i18n-title` | `title` attribute |
| `data-i18n-aria-label` | `aria-label` attribute |

## UI localization workflow

1. Add or update keys in both locale catalogs.
2. Use `extension/lib/i18n.js` helpers for runtime rendering.
3. Use underscore-only keys in locale files even when the logical key in code is dotted.
4. Persist the global UI setting in `chrome.storage.local` as `uiLanguageMode`.
5. Supported UI values: `auto` | `en` | `pt_BR`
6. `auto` follows the browser locale.

## Search localization workflow

1. Persist per-mode search language settings in popup state.
2. Supported search-language values: `auto` | `en` | `pt_BR` | `bilingual`
3. Use `extension/lib/search-language.js` to resolve the effective search locale.
4. Use localized term dictionaries inside `extension/lib/search-templates.js` and related builders.
5. Never localize explicit user-entered company names or other free-form user filters.

## Defaults

- UI default: `auto`
- Search-language default per mode: `auto`
- `auto` search language should prefer the most effective market language, not literal translation.

## Common pitfalls

1. **CSS sibling selectors**: Use `+` (adjacent sibling) instead of `~` (general sibling) when extracting DOM sections that follow landmark IDs like `#skills` or `#experience`. The `~` selector bleeds across sections.
2. **Key parity**: Always add keys to both `en` and `pt_BR` catalogs simultaneously. The `i18n.test.js` suite validates required keys exist in both.
3. **Substitution tokens**: Use `$1`, `$2` etc. in locale messages. Pass substitution values as an array to `getMessage`.
4. **Catalog caching**: `loadLocaleMessages` caches by resolved locale. If you change a catalog at runtime (tests), call `jest.resetModules()` first.
5. **Jobs auto locale**: For Brazil-local searches, auto should resolve to `pt_BR`; for offshore/global, it should resolve to `en`.

## Validation

Run before shipping:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
```

Check manually:

- popup is fully English or fully Portuguese
- dashboard is fully English or fully Portuguese
- notifications use the selected UI language
- Connect, Companies, and Jobs queries change by search-language mode
- unpacked extension reloads successfully in Chrome/Brave after locale edits
- popup/options pages show no extension-owned locale lookup errors in DevTools
- Brave smoke checklist:
  - extension loads from `extension/` with no manifest/key error
  - popup `UI Language`, template toggles, and tag-search label localize cleanly
  - options/dashboard localizes cleanly and has no async DOM null-write errors
  - Jobs auto locale stays PT-BR for Brazil-local searches unless offshore mode is explicitly on

## Test coverage

The following tests validate i18n behavior:

| Test file | Coverage targets |
|---|---|
| `tests/i18n.test.js` | Key normalization, locale resolution, getMessage, applyTranslations (DOM), substitutions, catalog loading, parity |
| `tests/search-language.test.js` | Per-mode search locale resolution |
| `tests/search-templates.test.js` | Boolean query compilation with locale-aware terms |
