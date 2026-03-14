const fs = require('fs');
const path = require('path');
const {
    normalizeUiLanguageMode,
    normalizeCatalogKey,
    resolveUiLocale,
    getMessage,
    loadLocaleMessages
} = require('../extension/lib/i18n');

const LOCALES = ['en', 'pt_BR'];

function readLocaleCatalog(locale) {
    const filePath = path.join(
        __dirname,
        '..',
        'extension',
        '_locales',
        locale,
        'messages.json'
    );
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('i18n', () => {
    it('normalizes ui language mode with auto fallback', () => {
        expect(normalizeUiLanguageMode('en')).toBe('en');
        expect(normalizeUiLanguageMode('pt_BR')).toBe('pt_BR');
        expect(normalizeUiLanguageMode('invalid')).toBe('auto');
    });

    it('resolves browser locale automatically', () => {
        expect(resolveUiLocale('auto', 'pt-BR')).toBe('pt_BR');
        expect(resolveUiLocale('auto', 'pt-PT')).toBe('pt_BR');
        expect(resolveUiLocale('auto', 'en-US')).toBe('en');
    });

    it('prefers explicit locale override over browser locale', () => {
        expect(resolveUiLocale('en', 'pt-BR')).toBe('en');
        expect(resolveUiLocale('pt_BR', 'en-US')).toBe('pt_BR');
    });

    it('falls back to english when a key is missing in the active locale', () => {
        const active = {
            known: { message: 'Olá' }
        };
        const fallback = {
            known: { message: 'Hello' },
            missing: { message: 'Fallback copy' }
        };

        expect(getMessage(active, fallback, 'known')).toBe('Olá');
        expect(getMessage(active, fallback, 'missing')).toBe('Fallback copy');
        expect(getMessage(active, fallback, 'unknown')).toBe('');
    });

    it('normalizes logical dotted keys to Chrome-safe locale catalog keys', () => {
        expect(normalizeCatalogKey('common.mode')).toBe('common_mode');
        expect(normalizeCatalogKey('jobs.search-language')).toBe(
            'jobs_search_language'
        );
    });

    it('loads english and portuguese locale catalogs from disk', async () => {
        const en = await loadLocaleMessages('en');
        const pt = await loadLocaleMessages('pt_BR');

        expect(en.extensionName.message).toBe('LinkedIn Engage');
        expect(getMessage(en, {}, 'common.mode')).toBe('Mode');
        expect(getMessage(pt, {}, 'common.mode')).toBe('Modo');
        expect(getMessage(pt, {}, 'common.searchLanguage'))
            .toBe('Idioma da busca');
    });

    it('includes critical popup and dashboard localization keys in both catalogs', async () => {
        const en = await loadLocaleMessages('en');
        const pt = await loadLocaleMessages('pt_BR');
        const requiredKeys = [
            'common.connect',
            'common.companies',
            'common.jobs',
            'common.feed',
            'popup.progress.page',
            'popup.progress.skipped',
            'options.card.avgPerDay',
            'options.card.bestHour',
            'options.card.bestDay',
            'options.card.topCategory'
        ];

        requiredKeys.forEach(key => {
            expect(getMessage(en, {}, key)).toBeTruthy();
            expect(getMessage(pt, {}, key)).toBeTruthy();
        });
    });

    it('stores only Chrome-safe keys in both locale catalogs', () => {
        LOCALES.forEach(locale => {
            const keys = Object.keys(readLocaleCatalog(locale));
            keys.forEach(key => {
                expect(key).toMatch(/^[A-Za-z0-9_]+$/);
            });
        });
    });

    it('resolves dotted logical keys against underscore locale keys', async () => {
        const pt = await loadLocaleMessages('pt_BR');

        expect(getMessage(pt, {}, 'common.mode')).toBe('Modo');
        expect(
            getMessage(pt, {}, 'popup.connect.selectedCount', [3])
        ).toBe('3 selecionados');
    });

    it('interpolates locale substitutions from catalog messages', () => {
        const active = {
            summary: { message: 'Rate limits: $1/$2 today' }
        };

        expect(
            getMessage(active, {}, 'summary', [4, 10])
        ).toBe('Rate limits: 4/10 today');
    });
});
