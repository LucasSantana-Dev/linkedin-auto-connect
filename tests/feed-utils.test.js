/**
 * @jest-environment jsdom
 */
const {
    getReactionType,
    classifyPost,
    buildCommentFromPost,
    extractTopic,
    isReactablePost,
    shouldSkipPost,
    isCompanyFollowText,
    POST_CATEGORIES,
    CATEGORY_TEMPLATES
} = require('../extension/lib/feed-utils');

describe('getReactionType', () => {
    const keywords = {
        celebrate: ['congrat', 'promoted', 'new role'],
        support: ['struggle', 'layoff', 'mental health'],
        insightful: ['research', 'data', 'study'],
        funny: ['joke', 'humor', 'lol'],
        love: ['passion', 'grateful', 'inspire']
    };

    it('returns PRAISE for celebrate keywords', () => {
        expect(getReactionType(
            'Congratulations on the new role!', keywords
        )).toBe('PRAISE');
    });

    it('returns EMPATHY for support keywords', () => {
        expect(getReactionType(
            'Mental health matters in tech', keywords
        )).toBe('EMPATHY');
    });

    it('returns INTEREST for insightful keywords', () => {
        expect(getReactionType(
            'New research on AI trends', keywords
        )).toBe('INTEREST');
    });

    it('returns ENTERTAINMENT for funny keywords', () => {
        expect(getReactionType(
            'This joke is hilarious lol', keywords
        )).toBe('ENTERTAINMENT');
    });

    it('returns APPRECIATION for love keywords', () => {
        expect(getReactionType(
            'So grateful for this team', keywords
        )).toBe('APPRECIATION');
    });

    it('returns LIKE as default', () => {
        expect(getReactionType(
            'Just another day at work', keywords
        )).toBe('LIKE');
    });

    it('returns LIKE for empty text', () => {
        expect(getReactionType('', keywords)).toBe('LIKE');
        expect(getReactionType(null, keywords)).toBe('LIKE');
    });

    it('returns LIKE when no keywords provided', () => {
        expect(getReactionType('congrats!', null)).toBe('LIKE');
    });

    it('is case-insensitive', () => {
        expect(getReactionType(
            'CONGRATULATIONS!', keywords
        )).toBe('PRAISE');
    });
});

describe('classifyPost', () => {
    it('classifies hiring posts', () => {
        expect(classifyPost(
            'We\'re hiring a senior engineer! Join our team.'
        )).toBe('hiring');
    });

    it('classifies achievement posts', () => {
        expect(classifyPost(
            'Excited to announce I\'ve been promoted ' +
            'to Staff Engineer!'
        )).toBe('achievement');
    });

    it('classifies technical posts', () => {
        expect(classifyPost(
            'How we improved our API latency by ' +
            'refactoring the database layer and ' +
            'adding caching with Redis'
        )).toBe('technical');
    });

    it('classifies question posts', () => {
        expect(classifyPost(
            'What do you think about the future ' +
            'of remote work? Curious to hear your thoughts?'
        )).toBe('question');
    });

    it('classifies tips posts', () => {
        expect(classifyPost(
            'Pro tip: Here\'s what I learned about ' +
            'writing clean code. Best practice is ' +
            'to keep functions small.'
        )).toBe('tips');
    });

    it('classifies story posts', () => {
        expect(classifyPost(
            'Let me tell you about my journey. ' +
            '5 years ago I was rejected from every ' +
            'company I applied to.'
        )).toBe('story');
    });

    it('classifies news posts', () => {
        expect(classifyPost(
            'Just announced: The latest report shows ' +
            'significant growth in the AI market. ' +
            'Industry trend worth watching.'
        )).toBe('news');
    });

    it('returns generic for unclassifiable posts', () => {
        expect(classifyPost(
            'Beautiful sunset today'
        )).toBe('generic');
    });

    it('returns generic for empty/null text', () => {
        expect(classifyPost('')).toBe('generic');
        expect(classifyPost(null)).toBe('generic');
    });

    it('picks category with most keyword matches', () => {
        expect(classifyPost(
            'We\'re hiring! Open role for engineers. ' +
            'Apply now and join our team. ' +
            'Send your resume today.'
        )).toBe('hiring');
    });

    it('classifies PT-BR hiring posts', () => {
        expect(classifyPost(
            'Estamos contratando! Vaga para dev senior.'
        )).toBe('hiring');
    });
});

describe('buildCommentFromPost', () => {
    it('uses built-in templates when no user templates', () => {
        const result = buildCommentFromPost(
            'Excited to announce I got promoted!', null
        );
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(10);
    });

    it('uses user templates when provided', () => {
        const result = buildCommentFromPost(
            'Great article about AI',
            ['Nice post about {topic}!']
        );
        expect(result).toBe('Nice post about AI!');
    });

    it('replaces {topic} with extracted topic', () => {
        const result = buildCommentFromPost(
            'Great article about AI and machine learning',
            ['Interesting take on {topic}!']
        );
        expect(result).toBe('Interesting take on AI!');
    });

    it('replaces {excerpt} with post substring', () => {
        const result = buildCommentFromPost(
            'Hello world this is a test',
            ['Re: {excerpt}']
        );
        expect(result).toContain('Re: Hello world');
    });

    it('replaces {category} with detected category', () => {
        const result = buildCommentFromPost(
            'We\'re hiring engineers!',
            ['Category: {category}']
        );
        expect(result).toBe('Category: hiring');
    });

    it('replaces all {topic} occurrences', () => {
        const result = buildCommentFromPost(
            'AI is great',
            ['{topic} and {topic}']
        );
        expect(result).toBe('AI and AI');
    });

    it('uses category-appropriate built-in template', () => {
        const results = new Set();
        for (let i = 0; i < 30; i++) {
            results.add(buildCommentFromPost(
                'We\'re hiring! Open role for engineers.',
                null
            ));
        }
        for (const comment of results) {
            expect(comment).toBeTruthy();
            expect(comment.length).toBeGreaterThan(20);
        }
    });

    it('picks random templates from pool', () => {
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(buildCommentFromPost(
                'Just deployed our new Kubernetes cluster',
                null
            ));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('extractTopic', () => {
    it('returns AI for AI-related text', () => {
        expect(extractTopic('AI is changing the world'))
            .toBe('AI');
    });

    it('returns specific tech topics', () => {
        expect(extractTopic('We use React and Next.js'))
            .toBe('frontend development');
        expect(extractTopic('Deploying with Docker'))
            .toBe('containerization');
        expect(extractTopic('AWS Lambda is powerful'))
            .toBe('cloud infrastructure');
        expect(extractTopic('Python FastAPI backend'))
            .toBe('Python');
    });

    it('returns career topics', () => {
        expect(extractTopic('Tips for career growth'))
            .toBe('career growth');
        expect(extractTopic('Remote work is the future'))
            .toBe('remote work');
    });

    it('returns "this topic" for unrecognized content', () => {
        expect(extractTopic('Nothing special here'))
            .toBe('this topic');
    });

    it('returns "this" for empty text', () => {
        expect(extractTopic('')).toBe('this');
        expect(extractTopic(null)).toBe('this');
    });

    it('matches first topic when multiple present', () => {
        const result = extractTopic(
            'AI and machine learning with Python'
        );
        expect(result).toBe('AI');
    });
});

describe('isReactablePost', () => {
    it('returns false for null', () => {
        expect(isReactablePost(null)).toBe(false);
    });

    it('returns false for short content', () => {
        const el = document.createElement('div');
        el.textContent = 'Short';
        expect(isReactablePost(el)).toBe(false);
    });

    it('returns true for substantial content', () => {
        const el = document.createElement('div');
        const longText = 'This is a long enough post ' +
            'with substantial content to engage with.';
        el.textContent = longText;
        document.body.appendChild(el);
        expect(isReactablePost(el)).toBe(true);
        document.body.removeChild(el);
    });
});

describe('shouldSkipPost', () => {
    it('returns false with no keywords', () => {
        expect(shouldSkipPost('any text', [])).toBe(false);
        expect(shouldSkipPost('any text', null)).toBe(false);
    });

    it('skips when keyword matches', () => {
        expect(shouldSkipPost(
            'This is a Sponsored post', ['sponsored']
        )).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(shouldSkipPost(
            'PROMOTED content', ['promoted']
        )).toBe(true);
    });

    it('does not skip when no keyword matches', () => {
        expect(shouldSkipPost(
            'Great engineering article', ['sponsored', 'ad']
        )).toBe(false);
    });
});

describe('isCompanyFollowText', () => {
    it('matches Follow', () => {
        expect(isCompanyFollowText('Follow')).toBe(true);
    });

    it('matches Seguir (PT)', () => {
        expect(isCompanyFollowText('Seguir')).toBe(true);
    });

    it('matches + Follow', () => {
        expect(isCompanyFollowText('+ Follow')).toBe(true);
    });

    it('matches + Seguir', () => {
        expect(isCompanyFollowText('+ Seguir')).toBe(true);
    });

    it('trims whitespace', () => {
        expect(isCompanyFollowText('  Follow  ')).toBe(true);
    });

    it('rejects Following', () => {
        expect(isCompanyFollowText('Following')).toBe(false);
    });

    it('rejects empty', () => {
        expect(isCompanyFollowText('')).toBe(false);
        expect(isCompanyFollowText(null)).toBe(false);
    });
});

describe('POST_CATEGORIES', () => {
    it('has all expected categories', () => {
        const expected = [
            'hiring', 'achievement', 'technical',
            'question', 'tips', 'story', 'news'
        ];
        for (const cat of expected) {
            expect(POST_CATEGORIES[cat]).toBeDefined();
            expect(POST_CATEGORIES[cat].length)
                .toBeGreaterThan(0);
        }
    });
});

describe('CATEGORY_TEMPLATES', () => {
    it('has templates for all categories plus generic', () => {
        const expected = [
            'hiring', 'achievement', 'technical',
            'question', 'tips', 'story', 'news', 'generic'
        ];
        for (const cat of expected) {
            expect(CATEGORY_TEMPLATES[cat]).toBeDefined();
            expect(CATEGORY_TEMPLATES[cat].length)
                .toBeGreaterThan(0);
        }
    });

    it('most templates contain {topic} placeholder', () => {
        let total = 0;
        let withTopic = 0;
        for (const templates of
            Object.values(CATEGORY_TEMPLATES)) {
            for (const tmpl of templates) {
                total++;
                if (tmpl.includes('{topic}')) withTopic++;
            }
        }
        expect(withTopic / total).toBeGreaterThan(0.8);
    });
});
