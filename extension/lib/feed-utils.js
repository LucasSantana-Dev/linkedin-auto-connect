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

const POST_CATEGORIES = {
    hiring: [
        'hiring', 'we\'re looking', 'job opening',
        'open role', 'apply now', 'join our team',
        'join us', 'position available', 'dm me',
        'send your resume', 'vaga', 'contratando',
        'estamos buscando'
    ],
    achievement: [
        'promoted', 'new role', 'excited to announce',
        'thrilled to share', 'milestone', 'award',
        'certified', 'graduated', 'accepted',
        'just joined', 'new chapter', 'happy to share',
        'proud to', 'orgulho', 'conquista'
    ],
    technical: [
        'architecture', 'algorithm', 'deploy',
        'performance', 'scalab', 'microservice',
        'database', 'refactor', 'ci/cd', 'pipeline',
        'kubernetes', 'docker', 'api', 'framework',
        'testing', 'debug', 'production', 'latency',
        'distributed', 'caching'
    ],
    question: [
        'what do you think', 'thoughts?', 'agree?',
        'how do you', 'what\'s your', 'would you',
        'curious to hear', 'any recommendations',
        'what are your', 'poll:', 'opinião',
        'o que vocês acham'
    ],
    tips: [
        'tip:', 'lesson learned', 'here\'s what i',
        'mistake i made', 'advice', 'pro tip',
        'things i wish', 'do this instead',
        'stop doing', 'start doing', 'best practice',
        'cheat sheet', 'thread:', 'dica:'
    ],
    story: [
        'years ago', 'my journey', 'i remember when',
        'true story', 'let me tell you', 'looking back',
        'when i started', 'story time', 'i was rejected',
        'i failed', 'i quit', 'i got fired'
    ],
    news: [
        'just announced', 'breaking:', 'report shows',
        'according to', 'study finds', 'survey',
        'market', 'industry trend', 'funding',
        'acquisition', 'ipo', 'valuation', 'layoffs'
    ]
};

const CATEGORY_TEMPLATES = {
    hiring: [
        'Great opportunity! {topic} roles are in high ' +
            'demand right now.',
        'Thanks for sharing this opening. The {topic} ' +
            'space needs more visibility for roles like this.',
        'Interesting role. Companies investing in ' +
            '{topic} talent are making a smart move.'
    ],
    achievement: [
        'Congratulations! Well-deserved achievement ' +
            'in {topic}.',
        'Amazing milestone! Your work in {topic} is ' +
            'truly inspiring.',
        'So happy to see this! Wishing you continued ' +
            'success in {topic}.'
    ],
    technical: [
        'Great technical insight on {topic}. This ' +
            'resonates with challenges I\'ve seen ' +
            'in production.',
        'Solid perspective on {topic}. Would love ' +
            'to see more posts like this in my feed.',
        'Really valuable breakdown of {topic}. ' +
            'The engineering community needs more ' +
            'knowledge sharing like this.'
    ],
    question: [
        'Great question about {topic}! I think the ' +
            'answer depends a lot on the context and ' +
            'team dynamics.',
        'Interesting discussion on {topic}. Would ' +
            'love to hear more perspectives on this.',
        'This is a question I\'ve been thinking about ' +
            'too. {topic} is evolving so fast.'
    ],
    tips: [
        'Saving this! Really practical advice on ' +
            '{topic}.',
        'This is gold. More people need to hear ' +
            'this about {topic}.',
        'Great tips on {topic}. Simple but ' +
            'effective advice.'
    ],
    story: [
        'Thanks for sharing your experience. Stories ' +
            'like this about {topic} are so valuable ' +
            'for the community.',
        'Really authentic post. Your journey in ' +
            '{topic} resonates with a lot of people.',
        'Love the honesty here. More people should ' +
            'share real experiences like this.'
    ],
    news: [
        'Interesting development in {topic}. ' +
            'Curious to see how this plays out.',
        'Thanks for sharing this update on {topic}. ' +
            'The industry is moving fast.',
        'Important trend to watch. {topic} is ' +
            'shaping the future of the industry.'
    ],
    generic: [
        'Great insight on {topic}! Thanks for sharing.',
        'Really interesting perspective on {topic}.',
        'Thanks for putting this out there. {topic} ' +
            'is always worth discussing.'
    ]
};

const TOPIC_MAP = [
    { pattern: /\b(artificial intelligence|ai|gpt|llm|genai)\b/i, label: 'AI' },
    { pattern: /\b(machine learning|ml|deep learning|neural)\b/i, label: 'machine learning' },
    { pattern: /\b(react|angular|vue|svelte|next\.?js)\b/i, label: 'frontend development' },
    { pattern: /\b(node\.?js|express|fastify|nest\.?js|deno|bun)\b/i, label: 'backend development' },
    { pattern: /\b(python|django|flask|fastapi)\b/i, label: 'Python' },
    { pattern: /\b(java|spring boot|kotlin)\b/i, label: 'Java' },
    { pattern: /\b(rust|go|golang)\b/i, label: 'systems programming' },
    { pattern: /\b(typescript|javascript)\b/i, label: 'TypeScript' },
    { pattern: /\b(docker|kubernetes|k8s|container)\b/i, label: 'containerization' },
    { pattern: /\b(aws|azure|gcp|cloud)\b/i, label: 'cloud infrastructure' },
    { pattern: /\b(devops|ci\/cd|pipeline|deploy)\b/i, label: 'DevOps' },
    { pattern: /\b(security|cybersec|vulnerability|owasp)\b/i, label: 'security' },
    { pattern: /\b(data engineer|etl|data pipeline|spark)\b/i, label: 'data engineering' },
    { pattern: /\b(remote work|work from home|wfh|hybrid)\b/i, label: 'remote work' },
    { pattern: /\b(hiring|recruit|talent|interview)\b/i, label: 'hiring' },
    { pattern: /\b(leader|management|team lead|cto)\b/i, label: 'leadership' },
    { pattern: /\b(startup|founder|entrepreneur|vc)\b/i, label: 'startups' },
    { pattern: /\b(product|pm|product manager|roadmap)\b/i, label: 'product management' },
    { pattern: /\b(design|ux|ui|figma|accessibility)\b/i, label: 'design' },
    { pattern: /\b(open source|oss|github|contribute)\b/i, label: 'open source' },
    { pattern: /\b(career|growth|mentoring|learning)\b/i, label: 'career growth' },
    { pattern: /\b(agile|scrum|kanban|sprint)\b/i, label: 'agile methodologies' },
    { pattern: /\b(database|sql|postgres|mongo|redis)\b/i, label: 'databases' },
    { pattern: /\b(mobile|ios|android|flutter|react native)\b/i, label: 'mobile development' },
    { pattern: /\b(blockchain|web3|crypto|smart contract)\b/i, label: 'blockchain' }
];

function classifyPost(postText) {
    if (!postText) return 'generic';
    const lower = postText.toLowerCase();
    let bestCategory = 'generic';
    let bestScore = 0;

    for (const [category, keywords] of
        Object.entries(POST_CATEGORIES)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
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
    return 'this topic';
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildCommentFromPost(postText, userTemplates) {
    const category = classifyPost(postText);
    const topic = extractTopic(postText);

    let template;
    if (userTemplates && userTemplates.length > 0) {
        template = pickRandom(userTemplates);
    } else {
        const pool = CATEGORY_TEMPLATES[category] ||
            CATEGORY_TEMPLATES.generic;
        template = pickRandom(pool);
    }

    const excerpt = (postText || '')
        .substring(0, 50).trim();
    return template
        .replace(/\{topic\}/g, topic)
        .replace(/\{excerpt\}/g, excerpt)
        .replace(/\{category\}/g, category);
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
        classifyPost,
        buildCommentFromPost,
        extractTopic,
        isReactablePost,
        shouldSkipPost,
        isCompanyFollowText,
        POST_CATEGORIES,
        CATEGORY_TEMPLATES,
        TOPIC_MAP
    };
}
