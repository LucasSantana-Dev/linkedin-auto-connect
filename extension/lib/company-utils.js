function normalizeCompanyName(value) {
    return String(value || '')
        .trim()
        .split('\n')[0]
        .trim();
}

function extractCompanySlugName(companyUrl) {
    if (!companyUrl) return '';
    const match = companyUrl.match(/\/company\/([^/?#]+)/i);
    if (!match || !match[1]) return '';
    return decodeURIComponent(match[1])
        .replace(/[-_]+/g, ' ')
        .trim();
}

function extractCompanyInfo(card) {
    const nameEl = card.querySelector(
        '.entity-result__title-text a span, ' +
        '.entity-result__title-text a, ' +
        '.app-aware-link span[dir]'
    );
    const subtitleEl = card.querySelector(
        '.entity-result__primary-subtitle'
    );
    const linkEl = card.querySelector(
        'a[href*="/company/"]'
    );

    const companyUrl = linkEl
        ? linkEl.href.split('?')[0]
        : '';
    const titleName = normalizeCompanyName(
        nameEl
            ? (nameEl.innerText || nameEl.textContent || '')
            : ''
    );
    const linkName = normalizeCompanyName(
        linkEl
            ? (linkEl.innerText || linkEl.textContent || '')
            : ''
    );
    const slugName = normalizeCompanyName(
        extractCompanySlugName(companyUrl)
    );
    const name = titleName || linkName || slugName || 'Unknown';
    const subtitle = subtitleEl
        ? (subtitleEl.innerText ||
            subtitleEl.textContent || '').trim()
        : '';

    return { name, subtitle, companyUrl };
}

function uniqueElements(elements) {
    const seen = new Set();
    const out = [];
    for (const el of elements) {
        if (!el || seen.has(el)) continue;
        seen.add(el);
        out.push(el);
    }
    return out;
}

function findFallbackCompanyContainers(root) {
    const el = root || document;
    const out = [];
    const links = el.querySelectorAll('a[href*="/company/"]');
    for (const link of links) {
        const container = link.closest(
            '.entity-result, ' +
            '.reusable-search__result-container, ' +
            '[data-chameleon-result-urn], ' +
            '.scaffold-layout__list-item, li'
        );
        if (!container) continue;
        if (!container.querySelector('button')) continue;
        if (!container.querySelector('a[href*="/company/"]')) continue;
        out.push(container);
    }
    return uniqueElements(out);
}

function matchesTargetCompanies(companyName, targets) {
    if (!targets || !targets.length) return true;
    const lower = (companyName || '').toLowerCase();
    return targets.some(t =>
        lower.includes(t.toLowerCase())
    );
}

function isFollowingText(text) {
    const t = (text || '').trim();
    return t === 'Following' || t === 'Seguindo';
}

function isNextPageButton(btn) {
    if (!btn || btn.disabled) return false;
    const label = btn.getAttribute('aria-label') || '';
    return label === 'Next' || label === 'Avançar';
}

function detectChallenge() {
    const url = (typeof window !== 'undefined'
        ? window.location.href : '');
    if (/checkpoint|authwall|challenge/i.test(url)) {
        return true;
    }
    const body = typeof document !== 'undefined'
        ? document.body : null;
    const text = (body?.innerText ||
        body?.textContent || '');
    return /security verification|unusual activity|verificação de segurança/i.test(text);
}

function buildCompanySearchUrl(query) {
    return 'https://www.linkedin.com/search/results/' +
        'companies/' +
        `?keywords=${encodeURIComponent(query)}` +
        '&origin=FACETED_SEARCH';
}

function findCompanyCards(root) {
    const el = root || document;
    const legacy = Array.from(el.querySelectorAll('.entity-result'));
    const chameleon = Array.from(el.querySelectorAll(
        '[data-chameleon-result-urn]'
    ));
    const reusable = Array.from(el.querySelectorAll(
        '.reusable-search__result-container'
    ));
    const fallback = findFallbackCompanyContainers(el);
    return uniqueElements([
        ...legacy,
        ...chameleon,
        ...reusable,
        ...fallback
    ]);
}

function findFollowBtnInCard(card) {
    const btns = card.querySelectorAll('button');
    for (const btn of btns) {
        if (isCompanyFollowText(
            btn.innerText || btn.textContent
        ) && !btn.disabled) {
            return btn;
        }
    }
    return null;
}

function isCompanyFollowText(text) {
    const t = (text || '').trim().replace(/^\+\s*/, '');
    if (!t) return false;
    if (/^(Following|Seguindo)\b/i.test(t)) return false;
    return /^(Follow|Seguir)\b/i.test(t);
}

function getResultsCountText(root) {
    const el = root || document;
    const selectors = [
        'h2 span',
        'h2',
        '.search-results-container__text',
        '.search-results__total',
        '[data-test-search-results-count]'
    ];
    for (const selector of selectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (/\b(results?|resultados?)\b/i.test(text)) {
                return text;
            }
        }
    }
    const bodyText = (el.body?.innerText ||
        el.body?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    const match = bodyText.match(
        /(?:about|cerca de|aproximadamente)?\s*[\d.,]+\s*(?:results?|resultados?)/i
    );
    return match ? match[0] : '';
}

function parseResultsCountHint(text) {
    if (!text) return null;
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    const match = normalized.match(
        /([\d][\d.,]*)\s*(?:results?|resultados?)/i
    );
    if (!match) return null;
    const digits = match[1].replace(/[^\d]/g, '');
    if (!digits) return null;
    const parsed = parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

function detectExplicitNoResults(root, resultsCountHint, resultsCountText) {
    if (resultsCountHint === 0) return true;
    const el = root || document;
    const patterns = /\b(?:no results found|nenhum resultado(?: encontrado)?|0\s*results?|0\s*resultados?)\b/i;
    const selectors = [
        '.search-no-results',
        '.search-results-container__no-results-message',
        '.artdeco-empty-state',
        'main'
    ];
    for (const selector of selectors) {
        const nodes = el.querySelectorAll(selector);
        for (const node of nodes) {
            const text = (node.innerText || node.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();
            if (patterns.test(text)) return true;
        }
    }
    if (patterns.test(resultsCountText || '')) return true;
    const bodyText = (el.body?.innerText ||
        el.body?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    return patterns.test(bodyText);
}

function getCompanySearchPageState(root) {
    const el = root || document;
    const legacyHits = el.querySelectorAll('.entity-result').length;
    const chameleonHits = el.querySelectorAll(
        '[data-chameleon-result-urn]'
    ).length;
    const reusableHits = el.querySelectorAll(
        '.reusable-search__result-container'
    ).length;
    const fallbackCards = findFallbackCompanyContainers(el);
    const cards = findCompanyCards(el);
    const resultsCountText = getResultsCountText(el);
    const resultsCountHint = parseResultsCountHint(resultsCountText);
    const isExplicitNoResults = detectExplicitNoResults(
        el,
        resultsCountHint,
        resultsCountText
    );
    return {
        cards,
        cardsFound: cards.length > 0,
        isExplicitNoResults,
        resultsCountHint,
        resultsCountText,
        selectorHits: {
            legacyEntity: legacyHits,
            chameleon: chameleonHits,
            reusable: reusableHits,
            fallbackLink: fallbackCards.length
        }
    };
}

function buildBatchFromRotation(
    allCompanies, startIdx, batchSize
) {
    if (!allCompanies || !allCompanies.length) return [];
    const start = startIdx % allCompanies.length;
    return allCompanies.slice(start, start + batchSize);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractCompanyInfo,
        matchesTargetCompanies,
        isFollowingText,
        isNextPageButton,
        detectChallenge,
        buildCompanySearchUrl,
        findCompanyCards,
        findFollowBtnInCard,
        isCompanyFollowText,
        getCompanySearchPageState,
        buildBatchFromRotation
    };
}
