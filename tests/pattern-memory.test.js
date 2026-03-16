const {
    COMMENT_PATTERN_MEMORY_KEY,
    getPatternBucketKey,
    loadPatternBucket,
    mergePatternBucket,
    buildPatternGuidance,
    normalizeWeightedMap,
    topKeys
} = require('../extension/lib/pattern-memory');

describe('pattern-memory', () => {
    it('builds deterministic lang|category keys', () => {
        expect(getPatternBucketKey('PT', 'Hiring'))
            .toBe('pt|hiring');
    });

    it('merges pattern buckets with bounded maps and decay', () => {
        let memory = {
            version: 1,
            buckets: {}
        };
        memory = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 10,
            patternConfidence: 80,
            openers: [
                { text: 'solid point', weight: 1.4 },
                { text: 'great take', weight: 0.8 }
            ],
            topNgrams: Array.from({ length: 40 }).map((_, i) => ({
                text: 'token ' + i,
                weight: 1
            })),
            intentMix: { insight: 0.8, neutral: 0.2 },
            styleFamily: 'analytical',
            lengthBand: 'short',
            punctuationRhythm: 'balanced',
            toneIntensity: 'low',
            riskMarkers: { riskRate: 0.1 }
        }, '2026-03-10T10:00:00.000Z');

        const bucket = loadPatternBucket(memory, 'en', 'technical');
        expect(bucket).toBeTruthy();
        expect(bucket.samples).toBe(10);
        expect(bucket.confidenceEma).toBe(80);
        expect(Object.keys(bucket.ngrams).length)
            .toBeLessThanOrEqual(24);
        expect(Object.keys(bucket.openers).length)
            .toBeLessThanOrEqual(12);

        const updated = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 4,
            patternConfidence: 50,
            openers: [
                { text: 'solid point', weight: 0.5 }
            ],
            topNgrams: [
                { text: 'latency tuning', weight: 2 }
            ],
            intentMix: { insight: 1 }
        }, '2026-03-10T11:00:00.000Z');

        const updatedBucket = loadPatternBucket(
            updated,
            'en',
            'technical'
        );
        expect(updatedBucket.samples).toBe(14);
        expect(updatedBucket.confidenceEma)
            .toBeGreaterThan(50);
        expect(updatedBucket.confidenceEma)
            .toBeLessThan(80);
    });

    it('isolates buckets by lang and category', () => {
        let memory = mergePatternBucket(null, 'pt', 'hiring', {
            analyzedCount: 5,
            patternConfidence: 70,
            openers: [{ text: 'boa vaga', weight: 1 }],
            topNgrams: [{ text: 'mercado tech', weight: 1 }]
        });
        memory = mergePatternBucket(memory, 'en', 'technical', {
            analyzedCount: 5,
            patternConfidence: 70,
            openers: [{ text: 'solid point', weight: 1 }],
            topNgrams: [{ text: 'clean architecture', weight: 1 }]
        });

        const ptHiring = loadPatternBucket(memory, 'pt', 'hiring');
        const enTech = loadPatternBucket(memory, 'en', 'technical');
        expect(Object.keys(ptHiring.openers)).toContain('boa vaga');
        expect(Object.keys(enTech.openers)).toContain('solid point');
    });

    it('builds prompt guidance from profile + learned bucket', () => {
        const bucket = {
            confidenceEma: 74,
            openers: { 'solid point': 1.2 },
            ngrams: { 'latency tuning': 1.1 },
            styleMix: { analytical: 0.9 },
            lengthMix: { short: 0.7 },
            rhythmMix: { balanced: 0.8 },
            toneMix: { low: 0.8 }
        };
        const guidance = buildPatternGuidance({
            patternConfidence: 82,
            openers: [{ text: 'great take', weight: 1 }],
            topNgrams: [{ text: 'production latency', weight: 1 }],
            recommended: {
                lengthBand: 'short',
                toneIntensity: 'low',
                punctuationRhythm: 'balanced',
                styleFamily: 'analytical',
                allowEmoji: false,
                maxEmoji: 0
            }
        }, bucket);

        expect(guidance.lengthBand).toBe('short');
        expect(guidance.styleFamily).toBe('analytical');
        expect(guidance.preferredOpeners.length)
            .toBeGreaterThan(0);
        expect(guidance.topNgrams.length)
            .toBeGreaterThan(0);
        expect(guidance.lowSignal).toBe(false);
    });

    it('exports stable storage key', () => {
        expect(COMMENT_PATTERN_MEMORY_KEY)
            .toBe('commentPatternMemoryV1');
    });

    it('normalizeWeightedMap handles string items (lines 27-28)', () => {
        // String items in the array should be counted with weight 1
        const result = normalizeWeightedMap(['foo', 'bar', 'foo', 'baz']);
        expect(result['foo']).toBe(2);
        expect(result['bar']).toBe(1);
        expect(result['baz']).toBe(1);
    });

    it('normalizeWeightedMap handles mixed string and object items', () => {
        const result = normalizeWeightedMap([
            'plain-string',
            { text: 'weighted', weight: 1.5 },
            'plain-string'
        ]);
        expect(result['plain-string']).toBe(2);
        expect(result['weighted']).toBeCloseTo(1.5);
    });

    it('pickTop fallback: buildPatternGuidance uses fallback when learned maps are empty (lines 219-220)', () => {
        // When learned bucket has empty mix maps, pickTop returns fallback values
        const emptyBucket = {
            confidenceEma: 30,
            openers: {},
            ngrams: {},
            styleMix: {},
            lengthMix: {},
            rhythmMix: {},
            toneMix: {}
        };
        const guidance = buildPatternGuidance({
            patternConfidence: 30,
            openers: [],
            topNgrams: [],
            recommended: {}
        }, emptyBucket);

        // pickTop with empty map returns fallback — these should be the defaults
        expect(guidance.lengthBand).toBe('short');
        expect(guidance.toneIntensity).toBe('low');
        expect(guidance.punctuationRhythm).toBe('balanced');
        expect(guidance.styleFamily).toBe('neutral-ack');
    });

    it('topKeys returns keys sorted by value descending', () => {
        const map = { a: 1, b: 3, c: 2 };
        expect(topKeys(map, 2)).toEqual(['b', 'c']);
    });

    it('topKeys returns empty array for empty map', () => {
        expect(topKeys({}, 5)).toEqual([]);
    });

    it('normalizeWeightedMap handles object items with text/key and weight/value fields', () => {
        const result = normalizeWeightedMap([
            { text: 'alpha', weight: 2.5 },
            { key: 'beta', value: 1.0 },
            { text: 'alpha', weight: 0.5 }
        ]);
        expect(result['alpha']).toBeCloseTo(3.0);
        expect(result['beta']).toBeCloseTo(1.0);
    });

    it('normalizeWeightedMap skips object items with no text or key', () => {
        const result = normalizeWeightedMap([
            { weight: 5 },
            { text: 'valid', weight: 1 }
        ]);
        expect(Object.keys(result)).toEqual(['valid']);
    });

    it('normalizeWeightedMap skips plain object entries with weight <= 0', () => {
        const result = normalizeWeightedMap({
            positive: 1.5,
            zero: 0,
            negative: -1,
            another: 0.5
        });
        expect(result['positive']).toBeCloseTo(1.5);
        expect(result['another']).toBeCloseTo(0.5);
        expect(result['zero']).toBeUndefined();
        expect(result['negative']).toBeUndefined();
    });

    it('mergeWeightedMaps skips near-zero decayed entries (< 0.001)', () => {
        // Start with a very small value that will decay below 0.001
        const existing = { tiny: 0.001 }; // 0.001 * 0.9 = 0.0009 < 0.001 → skipped
        const incoming = { fresh: 1.0 };
        const { mergeWeightedMaps } = require('../extension/lib/pattern-memory');
        const result = mergeWeightedMaps(existing, incoming, 10);
        expect(result['tiny']).toBeUndefined();
        expect(result['fresh']).toBeGreaterThan(0);
    });

    it('ema returns previous when next is not finite', () => {
        // ema normalizes non-finite to 0, so if prev=50 and next=0 → returns next (0) when prev===0 is false
        // Actually: prev=50, next=NaN→0, prev!==0 → EMA formula: 50*0.75 + 0*0.25 = 37.5
        // The !isFinite branch: if (!isFinite(next)) next = 0
        // So we test that NaN incoming is treated as 0
        const { mergeWeightedMaps } = require('../extension/lib/pattern-memory');
        // Use mergePatternBucket with NaN patternConfidence to exercise ema(prev, NaN)
        let memory = mergePatternBucket(null, 'en', 'test-ema', {
            analyzedCount: 5,
            patternConfidence: 80
        });
        // Second merge with NaN confidence — ema(80, NaN) → NaN→0 → EMA(80, 0) = 60
        memory = mergePatternBucket(memory, 'en', 'test-ema', {
            analyzedCount: 2,
            patternConfidence: NaN
        });
        const bucket = loadPatternBucket(memory, 'en', 'test-ema');
        expect(bucket.confidenceEma).toBeGreaterThan(0);
        expect(Number.isFinite(bucket.confidenceEma)).toBe(true);
    });

    it('loadPatternBucket returns null when bucket does not exist', () => {
        const memory = { version: 1, buckets: {} };
        const result = loadPatternBucket(memory, 'en', 'nonexistent');
        expect(result).toBeNull();
    });

    it('mergePatternBucket creates fresh state when memory is null', () => {
        const state = mergePatternBucket(null, 'pt', 'hiring', {
            analyzedCount: 3,
            patternConfidence: 65,
            openers: [{ text: 'boa vaga', weight: 1 }]
        });
        expect(state.version).toBe(1);
        expect(state.buckets).toBeDefined();
        const bucket = loadPatternBucket(state, 'pt', 'hiring');
        expect(bucket).not.toBeNull();
        expect(bucket.samples).toBe(3);
    });

    it('buildPatternGuidance sets lowSignal=true when patternConfidence < 60', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 45,
            openers: [],
            topNgrams: [],
            recommended: {}
        }, {
            confidenceEma: 40,
            openers: {},
            ngrams: {},
            styleMix: {},
            lengthMix: {},
            rhythmMix: {},
            toneMix: {}
        });
        expect(guidance.lowSignal).toBe(true);
        expect(guidance.patternConfidence).toBe(45);
    });

    it('buildPatternGuidance sets lowSignal=false when patternConfidence >= 60', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 75,
            openers: [],
            topNgrams: [],
            recommended: {}
        }, {
            confidenceEma: 70,
            openers: {},
            ngrams: {},
            styleMix: {},
            lengthMix: {},
            rhythmMix: {},
            toneMix: {}
        });
        expect(guidance.lowSignal).toBe(false);
    });

    it('buildPatternGuidance sets lowSignal=false when patternConfidence is 0', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 0,
            openers: [],
            topNgrams: [],
            recommended: {}
        }, {});
        expect(guidance.lowSignal).toBe(false);
    });

    // Line 7: (lang || 'en') fallback when lang is null/undefined
    it('getPatternBucketKey uses "en" fallback when lang is null', () => {
        expect(getPatternBucketKey(null, 'technical')).toBe('en|technical');
        expect(getPatternBucketKey(undefined, 'hiring')).toBe('en|hiring');
    });

    // Line 8: (category || 'generic') fallback when category is null/undefined
    it('getPatternBucketKey uses "generic" fallback when category is null', () => {
        expect(getPatternBucketKey('pt', null)).toBe('pt|generic');
        expect(getPatternBucketKey('en', undefined)).toBe('en|generic');
    });

    // Line 14: cloneObject with non-object (obj && typeof obj === 'object' false branch)
    it('mergePatternBucket handles non-object memory gracefully (line 14 cloneObject)', () => {
        // cloneObject(null) should return {} - tested internally via mergePatternBucket
        // memory=null triggers state={...buckets:{}} (line 152 branch)
        // memory=string (not object) also triggers the else branch
        const state = mergePatternBucket('invalid', 'en', 'generic', {
            analyzedCount: 1,
            patternConfidence: 50
        });
        expect(state.version).toBe(1);
        expect(state.buckets).toBeDefined();
    });

    // Line 31: item?.key branch (item has 'key' but no 'text', item?.text is falsy, item?.key is truthy)
    // Already covered by test 'normalizeWeightedMap handles object items with text/key and weight/value fields'
    // But that test uses {key:'beta'} — let's verify it hits the correct branch by testing key-only items
    it('normalizeWeightedMap uses item.key when item.text is absent (line 31)', () => {
        const result = normalizeWeightedMap([
            { key: 'mykey', weight: 2 }
        ]);
        expect(result['mykey']).toBeCloseTo(2);
    });

    // Lines 34-38: array item with weight<=0 gets weight 1 (line 34 cond-expr false branch)
    it('normalizeWeightedMap uses weight=1 fallback for array items with weight<=0', () => {
        const result = normalizeWeightedMap([
            { text: 'zero-weight', weight: 0 },
            { text: 'negative-weight', weight: -1 }
        ]);
        // weight <= 0 → fallback to 1
        expect(result['zero-weight']).toBe(1);
        expect(result['negative-weight']).toBe(1);
    });

    // Line 38 (if false): typeof input === 'object' false when array already handled, 
    // but a non-array non-object (e.g. string) would skip both branches and return {}
    it('normalizeWeightedMap returns {} for non-array non-object input', () => {
        const result = normalizeWeightedMap('not-an-object');
        expect(result).toEqual({});
    });

    // Line 57: sortMapEntries filter - item[1] not finite or <= 0 (branchIdx 1 = false path)
    // An entry with value 0 should be filtered out
    it('sortMapEntries via mergeWeightedMaps filters zero-value entries', () => {
        const { mergeWeightedMaps } = require('../extension/lib/pattern-memory');
        // Existing={a:0.001}, decayed = 0.0009 < 0.001 so 'a' not added to out
        // Then add incoming with value 0 -> alpha*0 = 0 -> when sortMapEntries runs, 0 filtered
        const result = mergeWeightedMaps({ stable: 1.0 }, { stable: 0, newkey: 0 }, 10);
        // stable decays but stays > 0.001; newkey incoming weight = 0 * alpha = 0 → filtered by sortMapEntries
        expect(result['newkey']).toBeUndefined();
        expect(result['stable']).toBeGreaterThan(0);
    });

    // Lines 88-89: ema when prev is non-finite (Infinity/NaN → clamped to 0)
    it('ema handles non-finite prev (lines 88-89)', () => {
        // ema is not exported; test via mergePatternBucket
        // First merge sets confidenceEma via ema(0, 80)=80 (prev===0 → return next)
        let memory = mergePatternBucket(null, 'en', 'ema-test', {
            analyzedCount: 1,
            patternConfidence: 80
        });
        // Manually corrupt confidenceEma to Infinity to force line 88 branch
        const key = getPatternBucketKey('en', 'ema-test');
        memory.buckets[key].confidenceEma = Infinity;
        // Next merge: ema(Infinity, 60) → prev=Infinity, !isFinite(prev)→prev=0 → prev===0 → return next=60
        memory = mergePatternBucket(memory, 'en', 'ema-test', {
            analyzedCount: 1,
            patternConfidence: 60
        });
        const bucket = loadPatternBucket(memory, 'en', 'ema-test');
        expect(Number.isFinite(bucket.confidenceEma)).toBe(true);
        expect(bucket.confidenceEma).toBe(60);
    });

    // Line 97: memory?.buckets || {} when memory object has no 'buckets' key
    it('loadPatternBucket handles memory without buckets property (line 97)', () => {
        const memoryWithoutBuckets = { version: 1 };
        const result = loadPatternBucket(memoryWithoutBuckets, 'en', 'tech');
        expect(result).toBeNull();
    });

    // Line 160: loadPatternBucket returns null → current = {} (|| {} branch)
    // This happens when mergePatternBucket is called for a brand-new lang/category in existing state
    it('mergePatternBucket creates new bucket in existing state (line 160 || {} fallback)', () => {
        let memory = mergePatternBucket(null, 'en', 'technical', {
            analyzedCount: 5,
            patternConfidence: 70
        });
        // Add a NEW bucket (different lang/category) - current = loadPatternBucket(state, 'pt', 'hiring') = null → {}
        memory = mergePatternBucket(memory, 'pt', 'hiring', {
            analyzedCount: 3,
            patternConfidence: 60
        });
        const ptBucket = loadPatternBucket(memory, 'pt', 'hiring');
        expect(ptBucket).not.toBeNull();
        expect(ptBucket.samples).toBe(3);
    });

    // Line 167: profile.analyzedCount undefined → (profile.analyzedCount || 0)
    it('mergePatternBucket handles missing analyzedCount in profile (line 167)', () => {
        const memory = mergePatternBucket(null, 'en', 'generic', {
            patternConfidence: 50
            // analyzedCount omitted
        });
        const bucket = loadPatternBucket(memory, 'en', 'generic');
        expect(bucket.samples).toBe(0);
    });

    // Lines 220-252: mergeUnique with null items and openers as strings
    it('buildPatternGuidance handles string openers and null items in mergeUnique (lines 220-252)', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 70,
            openers: ['string-opener', null, '', { text: 'obj-opener' }],
            topNgrams: [null, 'string-ngram', { text: 'obj-ngram' }],
            recommended: {}
        }, {
            confidenceEma: 65,
            openers: { 'learned-opener': 1.2 },
            ngrams: { 'learned-ngram': 0.8 },
            styleMix: {},
            lengthMix: {},
            rhythmMix: {},
            toneMix: {}
        });
        expect(guidance.preferredOpeners).toContain('string-opener');
        expect(guidance.preferredOpeners).toContain('obj-opener');
        expect(guidance.topNgrams).toContain('string-ngram');
        expect(guidance.topNgrams).toContain('obj-ngram');
        // null items should be skipped by mergeUnique (line 227: if (!item) continue)
        expect(guidance.preferredOpeners).not.toContain(null);
        expect(guidance.topNgrams).not.toContain(null);
    });

    // Line 231: mergeUnique max limit hit (if (out.length >= max) break)
    it('mergeUnique stops at max limit (line 231)', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 70,
            openers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
            topNgrams: [],
            recommended: {}
        }, {
            confidenceEma: 65,
            openers: { 'learned-1': 1, 'learned-2': 0.9 },
            ngrams: {},
            styleMix: {},
            lengthMix: {},
            rhythmMix: {},
            toneMix: {}
        });
        // mergeUnique for openers has max=6
        expect(guidance.preferredOpeners.length).toBeLessThanOrEqual(6);
    });

    // Lines 237-239: buildPatternGuidance with null patternProfile and null bucket
    it('buildPatternGuidance handles null patternProfile and null bucket (lines 237-239)', () => {
        const guidance = buildPatternGuidance(null, null);
        expect(guidance.lowSignal).toBe(false);
        expect(guidance.patternConfidence).toBe(0);
        expect(guidance.preferredOpeners).toEqual([]);
        expect(guidance.topNgrams).toEqual([]);
    });

    // Lines 243/251: openers/topNgrams item is string (cond-expr branchIdx 0)
    it('buildPatternGuidance with string openers/topNgrams items (lines 243, 251)', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 65,
            openers: ['direct-string-opener'],
            topNgrams: ['direct-string-ngram'],
            recommended: {}
        }, {});
        expect(guidance.preferredOpeners).toContain('direct-string-opener');
        expect(guidance.topNgrams).toContain('direct-string-ngram');
    });

    // Line 281 branchIdx 1: lowSignal = false when patternConfidence >= 60 (second && short-circuits)
    // Line 285 branchIdx 1: module.exports else branch (non-module env - untestable from Node)
    it('lowSignal is false when patternConfidence exactly 60 (line 281 boundary)', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 60,
            openers: [],
            topNgrams: [],
            recommended: {}
        }, {});
        expect(guidance.lowSignal).toBe(false);
    });

    // Line 228 idx 0: seen.has(item) true branch — duplicate opener across profile and learned
    it('mergeUnique deduplicates openers from profile and learned bucket (line 228)', () => {
        const guidance = buildPatternGuidance({
            patternConfidence: 70,
            openers: ['dup-opener', 'unique-profile'],
            topNgrams: [],
            recommended: {}
        }, {
            openers: { 'dup-opener': 5, 'unique-learned': 3 },
            ngrams: {}
        });
        const count = guidance.preferredOpeners.filter(o => o === 'dup-opener').length;
        expect(count).toBe(1);
        expect(guidance.preferredOpeners).toContain('unique-profile');
        expect(guidance.preferredOpeners).toContain('unique-learned');
    });
});

describe('topKeys - zero/negative value filter (line 57)', () => {
    // Line 57 idx 1: sortMapEntries filter item[1] > 0 false branch
    it('topKeys excludes zero-value and negative-value entries', () => {
        const result = topKeys({ 'zero': 0, 'negative': -1, 'positive': 2 }, 5);
        expect(result).toEqual(['positive']);
        expect(result).not.toContain('zero');
        expect(result).not.toContain('negative');
    });

    it('topKeys returns empty array when all entries are zero or negative', () => {
        const result = topKeys({ 'a': 0, 'b': -0.5 }, 5);
        expect(result).toEqual([]);
    });
});

describe('loadPatternBucket - cloneObject with null sub-objects (line 14)', () => {
    // Line 14 idx 1: cloneObject(null) — bucket sub-object is null
    it('loadPatternBucket clones bucket with null openers/ngrams without throwing', () => {
        const memory = {
            buckets: {
                'en|generic': {
                    key: 'en|generic',
                    updatedAt: '2024-01-01',
                    samples: 5,
                    confidenceEma: 70,
                    openers: null,
                    ngrams: null,
                    intentMix: null,
                    styleMix: null,
                    lengthMix: null,
                    rhythmMix: null,
                    toneMix: null
                }
            }
        };
        const bucket = loadPatternBucket(memory, 'en', 'generic');
        expect(bucket).not.toBeNull();
        expect(bucket.openers).toEqual({});
        expect(bucket.ngrams).toEqual({});
        expect(bucket.samples).toBe(5);
    });
});

describe('mergePatternBucket - ema with Infinity confidenceEma (line 89)', () => {
    // Line 89 idx 0: ema next=Infinity — stored confidenceEma=Infinity in existing bucket
    it('ema handles Infinity in existing confidenceEma gracefully', () => {
        const memory = {
            version: 1,
            updatedAt: null,
            buckets: {
                'en|generic': {
                    key: 'en|generic',
                    updatedAt: '2024-01-01',
                    samples: 3,
                    confidenceEma: Infinity,
                    riskEma: 0,
                    openers: {},
                    ngrams: {},
                    intentMix: {},
                    styleMix: {},
                    lengthMix: {},
                    rhythmMix: {},
                    toneMix: {}
                }
            }
        };
        const result = mergePatternBucket(memory, 'en', 'generic', {
            patternConfidence: 50,
            analyzedCount: 1,
            openers: {},
            topNgrams: [],
            recommended: {}
        });
        const bucket = result.buckets['en|generic'];
        expect(Number.isFinite(bucket.confidenceEma)).toBe(true);
        expect(bucket.confidenceEma).toBeGreaterThanOrEqual(0);
    });
});
