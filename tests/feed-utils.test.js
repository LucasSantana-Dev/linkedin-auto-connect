/**
 * @jest-environment jsdom
 */
const {
    getReactionType,
    buildCommentFromPost,
    extractTopic,
    isReactablePost,
    shouldSkipPost,
    isCompanyFollowText
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

describe('buildCommentFromPost', () => {
    it('returns null with empty templates', () => {
        expect(buildCommentFromPost('some text', [])).toBeNull();
        expect(buildCommentFromPost('some text', null))
            .toBeNull();
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

    it('picks a random template', () => {
        const templates = ['A', 'B', 'C'];
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            results.add(buildCommentFromPost('text', templates));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});

describe('extractTopic', () => {
    it('returns matching topic', () => {
        expect(extractTopic('AI is changing the world'))
            .toBe('AI');
    });

    it('returns "this topic" for unrecognized content', () => {
        expect(extractTopic('Nothing special here'))
            .toBe('this topic');
    });

    it('returns "this" for empty text', () => {
        expect(extractTopic('')).toBe('this');
        expect(extractTopic(null)).toBe('this');
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
