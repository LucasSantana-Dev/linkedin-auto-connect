const {
    CACHE_VERSION,
    PROFILE_FIELDS,
    normalizeStructuredProfile,
    encryptJobsProfileCache,
    decryptJobsProfileCache,
    getJobsProfileCacheStatus
} = require('../extension/lib/jobs-cache');

describe('jobs profile cache', () => {
    const profile = {
        fullName: 'Lucas Santana',
        email: 'lucas@example.com',
        phone: '+55 11 99999-1111',
        city: 'Sao Paulo',
        headline: 'Product Designer',
        portfolioUrl: 'https://portfolio.example.com'
    };

    describe('normalizeStructuredProfile', () => {
        it('normalizes string fields and strips whitespace', () => {
            const result = normalizeStructuredProfile({
                fullName: '  Lucas  Santana  ',
                headline: 'Engineer',
                city: '  São Paulo  '
            });

            expect(result.fullName).toBe('Lucas Santana');
            expect(result.headline).toBe('Engineer');
            expect(result.city).toBe('São Paulo');
        });

        it('normalizes array fields and removes empty entries', () => {
            const result = normalizeStructuredProfile({
                skills: ['React', '  ', '', 'Node.js', null, undefined]
            });

            expect(result.skills).toEqual(['React', 'Node.js']);
        });

        it('truncates arrays to 50 items', () => {
            const skills = Array.from({ length: 60 }, (_, i) => `Skill ${i}`);
            const result = normalizeStructuredProfile({ skills });
            expect(result.skills).toHaveLength(50);
        });

        it('omits null/undefined values', () => {
            const result = normalizeStructuredProfile({
                fullName: null,
                email: undefined,
                headline: 'Engineer'
            });

            expect(result.fullName).toBeUndefined();
            expect(result.email).toBeUndefined();
            expect(result.headline).toBe('Engineer');
        });

        it('omits empty string values after sanitization', () => {
            const result = normalizeStructuredProfile({
                fullName: '   ',
                headline: ''
            });

            expect(result.fullName).toBeUndefined();
            expect(result.headline).toBeUndefined();
        });

        it('omits empty arrays after filtering', () => {
            const result = normalizeStructuredProfile({
                skills: ['  ', '', null]
            });

            expect(result.skills).toBeUndefined();
        });

        it('ignores unknown keys not in PROFILE_FIELDS', () => {
            const result = normalizeStructuredProfile({
                fullName: 'Test',
                unknownField: 'should be ignored'
            });

            expect(result.fullName).toBe('Test');
            expect(result.unknownField).toBeUndefined();
        });

        it('returns empty object for null/invalid input', () => {
            expect(normalizeStructuredProfile(null)).toEqual({});
            expect(normalizeStructuredProfile(undefined)).toEqual({});
            expect(normalizeStructuredProfile('string')).toEqual({});
            expect(normalizeStructuredProfile(42)).toEqual({});
        });
    });

    describe('encryption', () => {
        it('encrypts and decrypts structured profile payload', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            expect(envelope.version).toBe(CACHE_VERSION);
            expect(typeof envelope.salt).toBe('string');
            expect(typeof envelope.iv).toBe('string');
            expect(typeof envelope.ciphertext).toBe('string');
            expect(typeof envelope.updatedAt).toBe('string');

            const decrypted = await decryptJobsProfileCache(
                envelope,
                'strong-passphrase'
            );
            expect(decrypted).toEqual(profile);
        });

        it('fails decrypt with wrong passphrase', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'correct-passphrase'
            );

            await expect(
                decryptJobsProfileCache(
                    envelope,
                    'wrong-passphrase'
                )
            ).rejects.toThrow('Invalid profile cache passphrase');
        });

        it('rejects invalid cache envelope', async () => {
            await expect(
                decryptJobsProfileCache(
                    { version: CACHE_VERSION, salt: 'abc' },
                    'passphrase'
                )
            ).rejects.toThrow('Invalid jobs profile cache envelope');
        });

        it('rejects null/empty envelope', async () => {
            await expect(
                decryptJobsProfileCache(null, 'passphrase')
            ).rejects.toThrow('Invalid jobs profile cache envelope');

            await expect(
                decryptJobsProfileCache({}, 'passphrase')
            ).rejects.toThrow('Invalid jobs profile cache envelope');
        });

        it('rejects short passphrase on encrypt', async () => {
            await expect(
                encryptJobsProfileCache(profile, 'ab')
            ).rejects.toThrow('at least 4 characters');
        });

        it('rejects short passphrase on decrypt', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            await expect(
                decryptJobsProfileCache(envelope, '   ')
            ).rejects.toThrow('at least 4 characters');
        });

        it('does not expose plaintext in encrypted envelope', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );
            const raw = JSON.stringify(envelope);
            expect(raw).not.toContain('Lucas Santana');
            expect(raw).not.toContain('lucas@example.com');
            expect(raw).not.toContain('Product Designer');
        });
    });

    describe('getJobsProfileCacheStatus', () => {
        it('returns not-exists for null/undefined envelope', () => {
            expect(getJobsProfileCacheStatus(null)).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });

            expect(getJobsProfileCacheStatus(undefined)).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });
        });

        it('returns not-exists for incomplete envelope', () => {
            expect(getJobsProfileCacheStatus({ salt: 'abc' })).toEqual({
                exists: false,
                locked: false,
                version: null,
                updatedAt: null
            });
        });

        it('returns exists/locked for valid envelope', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );

            const status = getJobsProfileCacheStatus(envelope);
            expect(status.exists).toBe(true);
            expect(status.locked).toBe(true);
            expect(status.version).toBe(CACHE_VERSION);
            expect(new Date(status.updatedAt).getTime()).not.toBeNaN();
        });

        it('falls back to CACHE_VERSION when version is missing', async () => {
            const envelope = await encryptJobsProfileCache(
                profile,
                'strong-passphrase'
            );
            delete envelope.version;

            const status = getJobsProfileCacheStatus(envelope);
            expect(status.version).toBe(CACHE_VERSION);
        });
    });

    describe('constants', () => {
        it('exports expected PROFILE_FIELDS', () => {
            expect(PROFILE_FIELDS).toContain('fullName');
            expect(PROFILE_FIELDS).toContain('email');
            expect(PROFILE_FIELDS).toContain('skills');
            expect(Object.isFrozen(PROFILE_FIELDS)).toBe(true);
        });
    });

    afterAll(() => {
        delete global.CACHE_VERSION;
        delete global.PROFILE_FIELDS;
        delete global.normalizeStructuredProfile;
        delete global.encryptJobsProfileCache;
        delete global.decryptJobsProfileCache;
        delete global.getJobsProfileCacheStatus;
    });
});
