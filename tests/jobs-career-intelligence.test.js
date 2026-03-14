const {
    validateResumeVaultFileMeta,
    analyzeJobsCareerInputs,
    buildJobsCareerSearchPlan,
    getBrazilOffshoreSignals
} = require('../extension/lib/jobs-career-intelligence');

describe('jobs career intelligence', () => {
    it('accepts pdf/docx and rejects legacy doc uploads', () => {
        expect(validateResumeVaultFileMeta({
            name: 'resume.pdf',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: true,
            extension: 'pdf'
        }));

        expect(validateResumeVaultFileMeta({
            name: 'resume.docx',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: true,
            extension: 'docx'
        }));

        expect(validateResumeVaultFileMeta({
            name: 'resume.doc',
            size: 1024
        })).toEqual(expect.objectContaining({
            ok: false,
            reason: 'unsupported-file-type'
        }));
    });

    it('builds deterministic career intelligence from profile and resumes', () => {
        const intel = analyzeJobsCareerInputs({
            profile: {
                currentTitle: 'Senior Full Stack Engineer',
                city: 'Goiania, Brazil',
                resumeSummary:
                    'Senior engineer focused on React, Node.js, AWS and ' +
                    'distributed product teams.'
            },
            importedProfile: {
                headline: 'Senior Full Stack Engineer | React | Node.js | AWS',
                location: 'Brazil',
                skills: ['React', 'Node.js', 'AWS', 'TypeScript'],
                experiences: [
                    'Senior Full Stack Engineer at Hubla',
                    'Software Engineer at CI&T'
                ]
            },
            resumeDocuments: [
                {
                    fileName: 'cv-lucas.pdf',
                    extractedText:
                        'Senior Full Stack Engineer building React, TypeScript, ' +
                        'Node.js and AWS products for global remote teams. ' +
                        'Worked with PostgreSQL, Redis and Docker.'
                }
            ]
        });

        expect(intel.areaPreset).toBe('tech');
        expect(intel.seniority).toBe('senior');
        expect(intel.inferredRoles).toEqual(
            expect.arrayContaining([
                'full stack engineer',
                'software engineer'
            ])
        );
        expect(intel.keywordTerms).toEqual(
            expect.arrayContaining([
                'react',
                'node.js',
                'aws',
                'typescript'
            ])
        );
        expect(intel.keywordTerms).not.toContain('team');
        expect(intel.locationTerms).toEqual(
            expect.arrayContaining(['brazil', 'remote'])
        );
        expect(intel.workType).toBe('2');
        expect(intel.experienceLevel).toBe('4');
    });

    it('builds a bounded boolean jobs search plan with keyword terms', () => {
        const plan = buildJobsCareerSearchPlan({
            areaPreset: 'tech',
            seniority: 'senior',
            inferredRoles: [
                'full stack engineer',
                'software engineer',
                'backend engineer'
            ],
            keywordTerms: [
                'react',
                'node.js',
                'aws',
                'typescript',
                'postgresql'
            ],
            locationTerms: ['brazil', 'remote'],
            workType: '2',
            experienceLevel: '4'
        }, {
            searchLanguageMode: 'en',
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.roleTerms).toEqual([
            'full stack engineer',
            'software engineer',
            'backend engineer'
        ]);
        expect(plan.resolvedSearchLocale).toBe('en');
        expect(plan.keywordTerms).toEqual(
            expect.arrayContaining(['react', 'aws'])
        );
        expect(plan.query).toContain('"full stack engineer"');
        expect(plan.query).toContain('"software engineer"');
        expect(plan.operatorCount).toBeLessThanOrEqual(12);
        expect(plan.workType).toBe('2');
        expect(plan.experienceLevel).toBe('4');
    });

    it('prefers portuguese auto locale for brazil-local plans when offshore is off', () => {
        const plan = buildJobsCareerSearchPlan({
            areaPreset: 'tech',
            seniority: 'senior',
            inferredRoles: ['software engineer'],
            keywordTerms: ['react', 'typescript'],
            locationTerms: ['brazil', 'remote'],
            workType: '2',
            experienceLevel: '4'
        }, {
            searchLanguageMode: 'auto',
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.resolvedSearchLocale).toBe('pt_BR');
        expect(plan.query.toLowerCase()).toContain('engenheiro de software');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('provides brazil offshore search signals', () => {
        expect(getBrazilOffshoreSignals()).toEqual(
            expect.arrayContaining([
                'brazil',
                'latam',
                'remote',
                'independent contractor',
                'employer of record',
                'timezone overlap'
            ])
        );
    });
});
