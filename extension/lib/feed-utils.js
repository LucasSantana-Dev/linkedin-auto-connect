if (typeof require === 'function' &&
    typeof module !== 'undefined' &&
    typeof POST_CATEGORIES === 'undefined') {
    var {
        POST_CATEGORIES, CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        CATEGORY_FOLLOW_UPS,
        CATEGORY_FOLLOW_UPS_PT,
        OPENERS, OPENERS_PT,
        TOPIC_MAP, HIGH_SIGNAL_CATEGORIES,
        PT_MARKERS, CONCEPT_PATTERNS,
        COMPOSED_EN, COMPOSED_PT
    } = require('./templates.js');
}

function getReactionType(postText, keywords) {
    const lower = (postText || '').toLowerCase();
    if (keywords?.celebrate?.some(k => lower.includes(k))) {
        return 'PRAISE';
    }
    if (keywords?.support?.some(k => lower.includes(k))) {
        return 'EMPATHY';
    }
    if (keywords?.insightful?.some(k => lower.includes(k))) {
        return 'INTEREST';
    }
    if (keywords?.funny?.some(k => lower.includes(k))) {
        return 'ENTERTAINMENT';
    }
    if (keywords?.love?.some(k => lower.includes(k))) {
        return 'APPRECIATION';
    }
    return 'LIKE';
}

function classifyPost(postText) {
    if (!postText) return 'generic';
    const lower = postText.toLowerCase();
    const scores = {};

    for (const [category, keywords] of
        Object.entries(POST_CATEGORIES)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                score++;
                if (kw.length > 8) score += 0.5;
            }
        }
        if (HIGH_SIGNAL_CATEGORIES.has(category)) {
            score *= 1.5;
        }
        scores[category] = score;
    }

    let bestCategory = 'generic';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestCategory = cat;
        }
    }

    if (bestScore < 1 && lower.length > 20) {
        for (const entry of TOPIC_MAP) {
            if (entry.pattern.test(lower)) {
                return 'technical';
            }
        }
    }
    return bestCategory;
}

function extractTopic(postText) {
    if (!postText) return 'this';
    for (const entry of TOPIC_MAP) {
        if (entry.pattern.test(postText)) {
            return entry.label;
        }
    }
    return 'tech';
}

function detectLanguage(text) {
    if (!text) return 'en';
    const lower = text.toLowerCase();
    let score = 0;
    for (const marker of PT_MARKERS) {
        if (lower.includes(marker)) score++;
    }
    return score >= 3 ? 'pt' : 'en';
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractKeyPhrase(postText) {
    if (!postText || postText.length < 10) return '';
    const sentences = postText
        .replace(/\n+/g, '. ')
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 15 && s.length < 120);
    if (!sentences.length) return '';

    const scored = sentences.map(s => {
        let score = 0;
        const lower = s.toLowerCase();
        const signals = [
            'important', 'key', 'the truth',
            'biggest', 'best', 'worst', 'never',
            'always', 'most people', 'nobody talks',
            'underrated', 'overrated', 'the problem',
            'the solution', 'what works', 'game changer',
            'don\'t', 'stop', 'start', 'here\'s why',
            'the real', 'actually', 'turns out'
        ];
        for (const sig of signals) {
            if (lower.includes(sig)) score += 2;
        }
        if (s.length > 30 && s.length < 80) score += 1;
        return { text: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score === 0) {
        return scored[
            Math.floor(Math.random() * Math.min(3,
                scored.length))
        ].text;
    }
    return best.text;
}

function lowerFirst(s) {
    if (!s) return s;
    if (s.length < 2) return s.toLowerCase();
    if (/^[A-Z]{2}/.test(s)) return s;
    return s[0].toLowerCase() + s.slice(1);
}

function humanize(comment) {
    let r = comment;

    if (Math.random() < 0.5) {
        r = r.replace(/\.$/, '');
    }

    if (Math.random() < 0.2 && /^[a-z]/.test(r)) {
        r = r[0].toUpperCase() + r.slice(1);
    }

    return r;
}

function extractConcepts(postText) {
    if (!postText) return [];
    const found = new Map();

    for (const pattern of CONCEPT_PATTERNS) {
        const regex = new RegExp(
            pattern.source, pattern.flags
        );
        let match;
        while ((match = regex.exec(postText)) !== null) {
            const term = match[1].trim();
            if (term.length < 2 || term.length > 40) {
                continue;
            }
            const key = term.toLowerCase();
            if (!found.has(key) ||
                term.length > found.get(key).length) {
                found.set(key, term);
            }
        }
    }

    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'that', 'this',
        'from', 'are', 'was', 'has', 'have', 'been',
        'will', 'can', 'not', 'but', 'all', 'our',
        'your', 'their', 'what', 'when', 'how',
        'just', 'more', 'some', 'also', 'than',
        'like', 'into', 'over', 'its', 'you',
        'que', 'com', 'uma', 'por', 'dos', 'das',
        'seu', 'sua', 'nos', 'são'
    ]);

    const articles = /^(o|a|os|as|um|uma|the|an?|el|la|los|las|do|da|dos|das|no|na|nos|nas|de|em|por|ao|à)\s+/i;

    return [...found.entries()]
        .filter(([key]) => !stopWords.has(key))
        .map(([key, val]) => {
            const cleaned = val.replace(articles, '');
            return [cleaned.toLowerCase(), cleaned];
        })
        .filter(([key, val]) =>
            val.length >= 3 && !stopWords.has(key))
        .sort((a, b) => b[1].length - a[1].length)
        .filter(([key], i, arr) =>
            !arr.some(([k], j) =>
                j < i && k.includes(key)))
        .map(([, val]) => val)
        .slice(0, 5);
}

function buildCommentFromPost(postText, userTemplates) {
    const category = classifyPost(postText);
    const lang = detectLanguage(postText);

    if (userTemplates && userTemplates.length > 0) {
        const topic = extractTopic(postText);
        const excerpt = (postText || '')
            .substring(0, 50).trim();
        let comment = pickRandom(userTemplates);
        comment = comment
            .replace(/\{topic\}/g, topic)
            .replace(/\{excerpt\}/g, excerpt)
            .replace(/\{category\}/g, category);
        return comment;
    }

    const concepts = extractConcepts(postText);

    if (concepts.length > 0) {
        const composed = lang === 'pt'
            ? COMPOSED_PT : COMPOSED_EN;
        const pool = composed[category] ||
            composed.generic;
        const fn = pickRandom(pool);
        let comment = fn(concepts);
        return humanize(comment);
    }

    const topic = extractTopic(postText);
    const textLen = (postText || '').length;
    const rawPhrase = extractKeyPhrase(postText);
    const phraseIsTooSimilar = rawPhrase &&
        rawPhrase.length > textLen * 0.7;
    const hasKeyPhrase = rawPhrase &&
        rawPhrase.length > 0 && !phraseIsTooSimilar;
    const keyPhrase = hasKeyPhrase
        ? '"' + lowerFirst(rawPhrase) + '"'
        : '';

    const templates = lang === 'pt'
        ? CATEGORY_TEMPLATES_PT : CATEGORY_TEMPLATES;
    const templatePool = templates[category] ||
        templates.generic;

    let candidates = templatePool;
    if (!hasKeyPhrase) {
        const noPhrase = templatePool.filter(
            t => !t.includes('{keyPhrase}')
        );
        if (noPhrase.length > 0) candidates = noPhrase;
    }
    let template = pickRandom(candidates);

    let comment = template
        .replace(/\{topic\}/g, topic)
        .replace(/\{keyPhrase\}/g, keyPhrase)
        .replace(/\{excerpt\}/g,
            (postText || '').substring(0, 50).trim())
        .replace(/\{category\}/g, category);

    comment = comment.replace(/\s{2,}/g, ' ').trim();
    if (comment.includes('""')) {
        comment = comment
            .replace(/\s*""\s*/g, ' ').trim();
    }

    const openers = lang === 'pt'
        ? OPENERS_PT : OPENERS;
    const opener = pickRandom(openers);
    if (opener && !comment.startsWith(opener.trim())) {
        comment = opener + comment;
    }

    return humanize(comment);
}

function isReactablePost(postEl) {
    if (!postEl) return false;
    const text = (postEl.innerText ||
        postEl.textContent || '').trim();
    return text.length > 20;
}

function shouldSkipPost(postText, skipKeywords) {
    if (!skipKeywords || !skipKeywords.length) return false;
    const lower = (postText || '').toLowerCase();
    return skipKeywords.some(k => lower.includes(
        k.toLowerCase()
    ));
}

function isCompanyFollowText(text) {
    const t = (text || '').trim();
    return t === 'Follow' || t === 'Seguir' ||
        t === '+ Follow' || t === '+ Seguir';
}

function getPostText(postEl) {
    if (!postEl) return '';
    const parts = [];

    const bodySelectors = [
        '.feed-shared-text',
        '.feed-shared-inline-show-more-text',
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '[data-test-id="main-feed-activity-content"]',
        'span.break-words',
        '.feed-shared-text-view span[dir="ltr"]',
        'div.feed-shared-update-v2__commentary ' +
            'span[dir="ltr"]',
        '[class*="update-components-text"] ' +
            'span[dir="ltr"]'
    ];
    for (const sel of bodySelectors) {
        const el = postEl.querySelector(sel);
        if (el) {
            const t = (el.innerText ||
                el.textContent || '').trim();
            if (t && t.length > 10 &&
                !parts.includes(t)) {
                parts.push(t);
                break;
            }
        }
    }

    const titleSel =
        '.feed-shared-article__title, ' +
        '.feed-shared-article__title-text, ' +
        '.update-components-article__title, ' +
        '.feed-shared-article-card__title, ' +
        '.article-card__title span';
    const titleEls = postEl.querySelectorAll(titleSel);
    for (const el of titleEls) {
        const t = (el.innerText ||
            el.textContent || '').trim();
        if (t && !parts.includes(t)) parts.push(t);
    }

    if (parts.length > 0) return parts.join(' ');

    const spans = postEl.querySelectorAll(
        'span[dir="ltr"]'
    );
    let longest = '';
    for (const s of spans) {
        const t = (s.innerText ||
            s.textContent || '').trim();
        if (t.length > longest.length) longest = t;
    }
    if (longest) return longest;

    const allText = (postEl.innerText ||
        postEl.textContent || '').trim();
    if (allText.length > 50) {
        const lines = allText.split('\n')
            .filter(l => l.trim().length > 15);
        if (lines.length > 0) {
            return lines.slice(0, 3).join(' ');
        }
    }
    return allText.substring(0, 500);
}

function getPostAuthor(postEl) {
    if (!postEl) return 'Unknown';
    const sel =
        '.update-components-actor__name span, ' +
        '.feed-shared-actor__name span, ' +
        'a.update-components-actor__meta-link span, ' +
        '[data-test-id*="actor-name"] span, ' +
        'span.feed-shared-actor__title span';
    const authorEl = postEl.querySelector(sel);
    return authorEl
        ? (authorEl.innerText ||
            authorEl.textContent || '').trim()
            .split('\n')[0]
        : 'Unknown';
}

function getPostUrn(postEl) {
    if (!postEl) return '';
    return postEl.getAttribute('data-urn') ||
        postEl.getAttribute('data-id') ||
        postEl.querySelector('[data-urn]')
            ?.getAttribute('data-urn') ||
        postEl.querySelector('[data-id]')
            ?.getAttribute('data-id') || '';
}

function isLikeButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    return /Like|Gostei|React|Reagir/i.test(label);
}

function isCommentButton(btn) {
    if (!btn) return false;
    const label = btn.getAttribute('aria-label') || '';
    const text = (btn.innerText ||
        btn.textContent || '').trim();
    return label.includes('Comment') ||
        label.includes('Comentar') ||
        text === 'Comment' ||
        text === 'Comentar';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        extractKeyPhrase,
        extractConcepts,
        humanize,
        detectLanguage,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        getPostText,
        getPostAuthor,
        getPostUrn,
        isLikeButton,
        isCommentButton,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        CATEGORY_TEMPLATES_PT,
        TOPIC_MAP
    };
}
