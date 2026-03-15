'use strict';

const {
    classifyCommentSentiment,
    summarizeCommentThread,
    SENTIMENT_PATTERNS,
    THREAD_STOP_WORDS
} = require('../extension/lib/feed-comment-analysis');

describe('feed-comment-analysis', () => {
    describe('classifyCommentSentiment', () => {
        it('returns generic for empty text', () => {
            expect(classifyCommentSentiment('')).toBe('generic');
            expect(classifyCommentSentiment(null)).toBe('generic');
        });

        it('classifies celebration sentiment', () => {
            expect(classifyCommentSentiment('Congratulations on the achievement!')).toBe('celebration');
            expect(classifyCommentSentiment('Parabéns pelo resultado!')).toBe('celebration');
        });

        it('classifies agreement sentiment', () => {
            expect(classifyCommentSentiment('I totally agree with this point')).toBe('agreement');
            expect(classifyCommentSentiment('Concordo completamente')).toBe('agreement');
        });

        it('classifies gratitude sentiment', () => {
            expect(classifyCommentSentiment('Thank you for sharing this')).toBe('gratitude');
            expect(classifyCommentSentiment('Obrigado pela informação')).toBe('gratitude');
        });

        it('classifies question sentiment', () => {
            expect(classifyCommentSentiment('How did you achieve this?')).toBe('question');
        });

        it('classifies insight sentiment', () => {
            expect(classifyCommentSentiment('Great point about the architecture')).toBe('insight');
        });

        it('classifies support sentiment', () => {
            expect(classifyCommentSentiment('Keep going, you are doing great!')).toBe('support');
        });

        it('classifies personal sentiment', () => {
            expect(classifyCommentSentiment('I also had this experience in my career')).toBe('personal');
        });

        it('returns generic for unmatched text', () => {
            expect(classifyCommentSentiment('Some random text without patterns')).toBe('generic');
        });
    });

    describe('summarizeCommentThread', () => {
        it('returns defaults for empty array', () => {
            const result = summarizeCommentThread([]);
            expect(result.count).toBe(0);
            expect(result.brevity).toBe('short');
            expect(result.energy).toBe('balanced');
        });

        it('returns defaults for non-array input', () => {
            const result = summarizeCommentThread(null);
            expect(result.count).toBe(0);
        });

        it('returns defaults when all items have empty text', () => {
            const result = summarizeCommentThread([
                { text: '' },
                { text: '   ' }
            ]);
            expect(result.count).toBe(0);
        });

        it('computes brevity=short for short comments (avgLength < 70)', () => {
            const result = summarizeCommentThread([
                { text: 'Short comment here.' },
                { text: 'Another brief one.' }
            ]);
            expect(result.brevity).toBe('short');
            expect(result.count).toBe(2);
        });

        it('computes brevity=medium for medium comments (70 <= avgLength < 140)', () => {
            const medText = 'This is a medium length comment that has enough words to be between seventy and one hundred forty characters long.';
            const result = summarizeCommentThread([{ text: medText }]);
            expect(result.avgLength).toBeGreaterThanOrEqual(70);
            expect(result.avgLength).toBeLessThan(140);
            expect(result.brevity).toBe('medium');
        });

        it('computes brevity=long for long comments (avgLength >= 140)', () => {
            const longText = 'This is a very long comment that exceeds one hundred and forty characters in total length. It contains many words and sentences to ensure the brevity classification returns long for this test case.';
            const result = summarizeCommentThread([{ text: longText }]);
            expect(result.avgLength).toBeGreaterThanOrEqual(140);
            expect(result.brevity).toBe('long');
        });

        it('computes energy=high when exclamation rate > 0.35', () => {
            const result = summarizeCommentThread([
                { text: 'Amazing work!' },
                { text: 'Incredible result!' },
                { text: 'Fantastic!' }
            ]);
            expect(result.energy).toBe('high');
        });

        it('computes energy=high when emoji rate > 0.25', () => {
            const result = summarizeCommentThread([
                { text: 'Great post 🎉' },
                { text: 'Love this 👏' },
                { text: 'Awesome 🙌' }
            ]);
            expect(result.energy).toBe('high');
        });

        it('computes energy=low when exclamation rate < 0.1 and emoji rate < 0.05', () => {
            const result = summarizeCommentThread([
                { text: 'This is a calm and measured response.' },
                { text: 'I think this approach has merit.' },
                { text: 'The analysis seems correct.' },
                { text: 'Worth considering further.' },
                { text: 'Interesting perspective on the topic.' },
                { text: 'The data supports this conclusion.' },
                { text: 'A reasonable point of view.' },
                { text: 'This aligns with current research.' },
                { text: 'The methodology appears sound.' },
                { text: 'Good analysis overall.' },
                { text: 'The evidence is compelling.' }
            ]);
            expect(result.energy).toBe('low');
        });

        it('computes energy=balanced for moderate rates', () => {
            const result = summarizeCommentThread([
                { text: 'Great work!' },
                { text: 'Interesting perspective here.' },
                { text: 'Worth considering.' }
            ]);
            // 1/3 exclamRate = 0.33 < 0.35, emojiRate = 0 < 0.25 → not high
            // exclamRate 0.33 >= 0.1 → not low
            expect(result.energy).toBe('balanced');
        });

        it('maps dominant sentiment to styleHint', () => {
            const result = summarizeCommentThread([
                { text: 'Congratulations on this achievement!' },
                { text: 'Parabéns pelo resultado!' }
            ]);
            expect(result.dominantSentiment).toBe('celebration');
            expect(result.styleHint).toBe('congratulatory');
        });

        it('handles opener with length <= 2 (skips opener tracking)', () => {
            // Single-word opener like "Ok" has length 2 → opener.length <= 2 → not tracked
            const result = summarizeCommentThread([
                { text: 'Ok this is fine.' }
            ]);
            // Should still process without error
            expect(result.count).toBe(1);
            // "ok" opener has length 2, so commonOpeners may be empty or not include it
            expect(Array.isArray(result.commonOpeners)).toBe(true);
        });

        it('skips short tokens in keyword extraction (length < 4)', () => {
            // Words like "is", "a", "ok" should be skipped
            const result = summarizeCommentThread([
                { text: 'is a ok' }
            ]);
            expect(result.keywords).toEqual([]);
        });

        it('skips short phrases in phrase extraction (length < 12)', () => {
            // Very short text should not produce sample phrases
            const result = summarizeCommentThread([
                { text: 'Hi there.' }
            ]);
            expect(result.samplePhrases).toEqual([]);
        });

        it('returns keywords from longer comments', () => {
            const result = summarizeCommentThread([
                { text: 'This architecture pattern improves scalability significantly.' }
            ]);
            expect(result.keywords.length).toBeGreaterThan(0);
        });

        it('returns commonOpeners from comments with longer openers', () => {
            const result = summarizeCommentThread([
                { text: 'Great point about the topic.' },
                { text: 'Great point about something else.' }
            ]);
            expect(result.commonOpeners).toContain('great point about');
        });
    });

    describe('mapSentimentToStyle (via summarizeCommentThread)', () => {
        const sentimentToStyle = [
            ['celebration', 'congratulatory'],
            ['support', 'supportive'],
            ['insight', 'analytical'],
            ['personal', 'personal'],
            ['agreement', 'affirming'],
            ['gratitude', 'grateful'],
            ['question', 'curious'],
            ['generic', 'neutral']
        ];

        for (const [sentiment, expectedStyle] of sentimentToStyle) {
            it(`maps ${sentiment} → ${expectedStyle}`, () => {
                // Force dominant sentiment by using matching text
                const textMap = {
                    celebration: 'Congratulations on this!',
                    support: 'Keep going, you can do it!',
                    insight: 'Great point about this topic.',
                    personal: 'I also had this experience.',
                    agreement: 'I totally agree with this.',
                    gratitude: 'Thank you for sharing this.',
                    question: 'How did you achieve this?',
                    generic: 'Some random unmatched text here.'
                };
                const result = summarizeCommentThread([{ text: textMap[sentiment] }]);
                expect(result.styleHint).toBe(expectedStyle);
            });
        }
    });

    describe('SENTIMENT_PATTERNS and THREAD_STOP_WORDS exports', () => {
        it('exports SENTIMENT_PATTERNS as an object', () => {
            expect(typeof SENTIMENT_PATTERNS).toBe('object');
            expect(SENTIMENT_PATTERNS.celebration).toBeInstanceOf(RegExp);
        });

        it('exports THREAD_STOP_WORDS as a Set', () => {
            expect(THREAD_STOP_WORDS).toBeInstanceOf(Set);
            expect(THREAD_STOP_WORDS.has('the')).toBe(true);
            expect(THREAD_STOP_WORDS.has('and')).toBe(true);
        });
    });
});
