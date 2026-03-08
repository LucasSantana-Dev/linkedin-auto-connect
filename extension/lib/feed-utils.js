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

function buildCommentFromPost(postText, templates) {
    if (!templates || !templates.length) return null;
    const template = templates[
        Math.floor(Math.random() * templates.length)
    ];
    const excerpt = (postText || '')
        .substring(0, 50).trim();
    return template
        .replace('{excerpt}', excerpt)
        .replace('{topic}', extractTopic(postText));
}

function extractTopic(postText) {
    if (!postText) return 'this';
    const lower = postText.toLowerCase();
    const topics = [
        'AI', 'machine learning', 'leadership',
        'hiring', 'remote work', 'career',
        'engineering', 'product', 'startup',
        'technology', 'innovation', 'design',
        'data', 'cloud', 'DevOps', 'security',
        'open source', 'frontend', 'backend'
    ];
    for (const topic of topics) {
        if (lower.includes(topic.toLowerCase())) {
            return topic;
        }
    }
    return 'this topic';
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getReactionType,
        buildCommentFromPost,
        extractTopic,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText
    };
}
