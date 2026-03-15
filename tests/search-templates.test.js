const {
    EXPECTED_RESULTS_BUCKETS,
    MODE_USAGE_GOALS,
    SEARCH_TEMPLATES,
    normalizeAreaFamily,
    normalizeExpectedResultsBucket,
    normalizeUsageGoal,
    selectSearchTemplate,
    compileBooleanQuery,
    buildSearchTemplatePlan
} = require('../extension/lib/search-templates');
const {
    normalizeSearchLanguageMode,
    resolveSearchLocale
} = require('../extension/lib/search-language');

describe('search-templates', () => {
    describe('search locale resolution', () => {
        it('uses portuguese for strong brazil local-market signals', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['Brazil'],
                jobsBrazilOffshoreFriendly: false
            });

            expect(locale).toBe('pt_BR');
        });

        it('uses english for global offshore searches', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['Global'],
                jobsBrazilOffshoreFriendly: true
            });

            expect(locale).toBe('en');
        });

        it('uses bilingual for broad exploratory searches', () => {
            const locale = resolveSearchLocale({
                mode: 'jobs',
                requestedMode: 'auto',
                selectedLocations: ['LATAM', 'Global'],
                expectedResultsBucket: 'broad',
                usageGoal: 'market_scan'
            });

            expect(locale).toBe('bilingual');
        });

        it('keeps explicit search-language overrides', () => {
            expect(normalizeSearchLanguageMode('pt_BR')).toBe('pt_BR');
            expect(resolveSearchLocale({
                mode: 'connect',
                requestedMode: 'en',
                selectedLocations: ['Brazil']
            })).toBe('en');
        });
    });

    it('exports supported expected-result buckets', () => {
        expect(EXPECTED_RESULTS_BUCKETS)
            .toEqual(['precise', 'balanced', 'broad']);
    });

    it('exports usage-goal catalogs by mode', () => {
        expect(MODE_USAGE_GOALS.connect).toContain(
            'recruiter_outreach'
        );
        expect(MODE_USAGE_GOALS.companies).toContain(
            'brand_watchlist'
        );
        expect(MODE_USAGE_GOALS.jobs).toContain(
            'high_fit_easy_apply'
        );
    });

    it('maps area presets to deterministic families', () => {
        expect(normalizeAreaFamily('tech')).toBe('tech');
        expect(normalizeAreaFamily('finance')).toBe('business');
        expect(normalizeAreaFamily('healthcare')).toBe('regulated');
        expect(normalizeAreaFamily('branding')).toBe('creative');
        expect(normalizeAreaFamily('headhunting')).toBe('talent');
        expect(normalizeAreaFamily('unknown')).toBe('custom');
    });

    it('normalizes unknown bucket and usage goal to defaults', () => {
        expect(normalizeExpectedResultsBucket('x'))
            .toBe('balanced');
        expect(
            normalizeUsageGoal('connect', 'x')
        ).toBe('recruiter_outreach');
    });

    it('resolves exact template match when auto mode is on', () => {
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true
        });
        expect(template.id).toBe(
            'connect.tech.recruiter_outreach.precise'
        );
    });

    it('resolves area-family fallback when exact area has no template', () => {
        const template = selectSearchTemplate({
            mode: 'connect',
            areaPreset: 'marketing',
            usageGoal: 'decision_makers',
            expectedResultsBucket: 'balanced',
            auto: true
        });
        expect(template.id).toBe(
            'connect.business.decision_makers.balanced'
        );
    });

    it('uses manual template when auto mode is off', () => {
        const template = selectSearchTemplate({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'market_scan',
            expectedResultsBucket: 'broad',
            auto: false,
            templateId: 'jobs.any.market_scan.broad'
        });
        expect(template.id).toBe('jobs.any.market_scan.broad');
    });

    it('caps boolean operators by budget', () => {
        const compiled = compileBooleanQuery({
            should: [
                'recruiter',
                'talent acquisition',
                'hiring manager',
                'sourcer',
                'head of talent'
            ],
            must: ['software', 'brazil'],
            budget: 4,
            explicitAnd: true,
            wrapShould: true
        });
        expect(compiled.operatorCount).toBeLessThanOrEqual(4);
    });

    it('builds connect template plan with deterministic diagnostics', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            selectedTags: {
                role: ['recruiter'],
                industry: ['software'],
                market: ['brazil'],
                level: []
            },
            roleTermsLimit: 10
        });
        expect(plan.template.id).toBe(
            'connect.tech.recruiter_outreach.precise'
        );
        expect(plan.query.length).toBeGreaterThan(10);
        expect(plan.meta.operatorCount).toBeGreaterThan(0);
        expect(plan.meta.compiledQueryLength).toBe(plan.query.length);
    });

    it('builds connect template plan with portuguese query terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'connect',
            areaPreset: 'tech',
            usageGoal: 'recruiter_outreach',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'pt_BR',
            selectedTags: {
                role: [],
                industry: [],
                market: ['Brazil'],
                level: []
            }
        });

        expect(plan.query.toLowerCase()).toContain('recrutador');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('builds jobs template plan preferring explicit role title terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'en',
            manualQuery: ''
        });
        expect(plan.template.id).toBe(
            'jobs.tech.high_fit_easy_apply.precise'
        );
        expect(plan.query.toLowerCase()).toContain('software engineer');
    });

    it('builds jobs template plan with portuguese role and location terms', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'pt_BR',
            manualQuery: ''
        });

        expect(plan.query.toLowerCase()).toContain('engenheiro de software');
        expect(plan.query.toLowerCase()).toContain('remoto');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('keeps jobs auto locale in portuguese for brazil-local runs when offshore is off', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'jobs',
            areaPreset: 'tech',
            usageGoal: 'high_fit_easy_apply',
            expectedResultsBucket: 'precise',
            auto: true,
            searchLanguageMode: 'auto',
            locationTerms: ['Brazil'],
            jobsBrazilOffshoreFriendly: false
        });

        expect(plan.meta.resolvedSearchLocale).toBe('pt_BR');
        expect(plan.query.toLowerCase()).toContain('brasil');
    });

    it('builds companies template plan with bilingual market terms within budget', () => {
        const plan = buildSearchTemplatePlan({
            mode: 'companies',
            areaPreset: 'tech',
            usageGoal: 'talent_watchlist',
            expectedResultsBucket: 'balanced',
            auto: true,
            searchLanguageMode: 'bilingual'
        });

        expect(plan.query.toLowerCase()).toContain('developer tools');
        expect(plan.query.toLowerCase()).toContain('ferramentas para desenvolvedores');
        expect(plan.meta.operatorCount).toBeLessThanOrEqual(12);
    });

    it('contains starter catalog templates', () => {
        const ids = SEARCH_TEMPLATES.map(t => t.id);
        expect(ids).toContain(
            'connect.tech.peer_networking.balanced'
        );
        expect(ids).toContain(
            'companies.creative.brand_watchlist.balanced'
        );
        expect(ids).toContain(
            'jobs.creative.target_company_roles.balanced'
        );
    });
});
