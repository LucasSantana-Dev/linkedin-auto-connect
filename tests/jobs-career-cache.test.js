const {
    CAREER_INTEL_CACHE_VERSION,
    encryptJobsCareerIntelState,
    decryptJobsCareerIntelState
} = require('../extension/lib/jobs-career-cache');

describe('jobs career intelligence cache', () => {
    const state = {
        importedProfile: {
            headline: 'Senior Full Stack Engineer'
        },
        documents: [{
            id: 'resume-1',
            fileName: 'cv.pdf'
        }],
        analysisSnapshot: {
            inferredRoles: ['full stack engineer'],
            keywordTerms: ['react', 'node.js', 'aws']
        }
    };

    it('encrypts and decrypts career intelligence state', async () => {
        const envelope = await encryptJobsCareerIntelState(
            state,
            'career-passphrase'
        );

        expect(envelope.version).toBe(CAREER_INTEL_CACHE_VERSION);
        expect(typeof envelope.updatedAt).toBe('string');

        const decrypted = await decryptJobsCareerIntelState(
            envelope,
            'career-passphrase'
        );
        expect(decrypted).toEqual(state);
    });

    it('fails decrypt with invalid passphrase', async () => {
        const envelope = await encryptJobsCareerIntelState(
            state,
            'career-passphrase'
        );

        await expect(
            decryptJobsCareerIntelState(
                envelope,
                'wrong-passphrase'
            )
        ).rejects.toThrow('Invalid career intelligence passphrase');
    });
});
