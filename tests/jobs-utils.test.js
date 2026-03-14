const {
    matchesExcludedJobCompany,
    evaluateJobCandidate,
    rankJobsForApply
} = require('../extension/lib/jobs-utils');

describe('jobs-utils matching and ranking', () => {
    it('matches excluded company with case/accent-insensitive comparison', () => {
        expect(matchesExcludedJobCompany(
            'Nubank',
            ['google', 'núbank']
        )).toBe('núbank');
    });

    it('skips jobs without easy apply', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-1',
                title: 'Product Designer',
                company: 'Acme',
                location: 'Sao Paulo',
                easyApply: false,
                alreadyApplied: false
            },
            {
                excludedCompanies: [],
                appliedJobIds: []
            }
        );
        expect(decision.skipReason).toBe('skipped-no-easy-apply');
    });

    it('allows non-easy-apply jobs when easyApplyOnly is false', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-1b',
                title: 'Product Designer',
                company: 'Acme',
                location: 'Sao Paulo',
                easyApply: false,
                alreadyApplied: false
            },
            {
                easyApplyOnly: false,
                excludedCompanies: [],
                appliedJobIds: []
            }
        );
        expect(decision.skipReason).toBeNull();
    });

    it('skips offshore-incompatible jobs when brazil offshore filter is enabled', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-offshore-skip',
                title: 'Senior React Engineer',
                company: 'Acme',
                location: 'Remote',
                easyApply: true,
                alreadyApplied: false,
                detailText:
                    'Remote role but US only. Must reside in the United States.'
            },
            {
                easyApplyOnly: false,
                jobsBrazilOffshoreFriendly: true,
                excludedCompanies: [],
                appliedJobIds: []
            }
        );

        expect(decision.skipReason).toBe('skipped-offshore-incompatible');
    });

    it('skips excluded company and returns matched company', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-2',
                title: 'Product Designer',
                company: 'Nubank',
                location: 'Sao Paulo',
                easyApply: true,
                alreadyApplied: false
            },
            {
                excludedCompanies: ['Banco do Brasil', 'núbank'],
                appliedJobIds: []
            }
        );

        expect(decision.skipReason).toBe('skipped-excluded-company');
        expect(decision.matchedExcludedCompany).toBe('núbank');
    });

    it('skips already applied jobs', () => {
        const decision = evaluateJobCandidate(
            {
                id: 'job-3',
                title: 'UX Designer',
                company: 'Design Co',
                location: 'Remote',
                easyApply: true,
                alreadyApplied: false
            },
            {
                excludedCompanies: [],
                appliedJobIds: ['job-3']
            }
        );
        expect(decision.skipReason).toBe('skipped-already-applied');
    });

    it('ranks by best fit score with deterministic ordering', () => {
        const ranked = rankJobsForApply(
            [
                {
                    id: 'top',
                    title: 'Senior Product Designer',
                    company: 'Acme',
                    location: 'Remote Brazil',
                    easyApply: true,
                    postedHoursAgo: 3,
                    seniority: 'senior',
                    workType: 'remote',
                    detailText:
                        'Remote role for LATAM contractors. Brazil candidates welcome.',
                    alreadyApplied: false
                },
                {
                    id: 'mid',
                    title: 'Designer',
                    company: 'Beta',
                    location: 'Sao Paulo',
                    easyApply: true,
                    postedHoursAgo: 2,
                    seniority: 'mid',
                    workType: 'hybrid',
                    detailText: 'Hybrid role in Sao Paulo office.',
                    alreadyApplied: false
                },
                {
                    id: 'low',
                    title: 'Software Engineer',
                    company: 'Gamma',
                    location: 'Remote',
                    easyApply: true,
                    postedHoursAgo: 6,
                    seniority: 'senior',
                    workType: 'remote',
                    detailText:
                        'US only role. Must reside in the United States.',
                    alreadyApplied: false
                }
            ],
            {
                excludedCompanies: [],
                appliedJobIds: [],
                roleTerms: ['product designer', 'ux designer'],
                keywordTerms: ['react', 'typescript'],
                desiredLevels: ['senior'],
                locationTerms: ['brazil', 'remote'],
                preferredCompanies: ['acme'],
                jobsBrazilOffshoreFriendly: true
            }
        );

        expect(ranked).toHaveLength(3);
        expect(ranked[0].id).toBe('top');
        expect(ranked[1].id).toBe('mid');
        expect(ranked[2].id).toBe('low');
        expect(ranked[2].skipReason).toBe('skipped-offshore-incompatible');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    afterAll(() => {
        delete global.matchesExcludedJobCompany;
        delete global.evaluateJobCandidate;
        delete global.rankJobsForApply;
        delete global.buildLinkedInJobsSearchUrl;
    });
});
