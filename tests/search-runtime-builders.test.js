'use strict';

describe('search-runtime-builders', () => {
    let lib;

    beforeEach(() => {
        // Reset require cache
        delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];

        // Set up globals for the lib dependencies
        const connectConfig = require('../extension/lib/connect-config');
        Object.assign(global, connectConfig);

        const connectQuery = require('../extension/lib/connect-query');
        Object.assign(global, connectQuery);

        const companyQuery = require('../extension/lib/company-query');
        Object.assign(global, companyQuery);

        const jobsProfile = require('../extension/lib/jobs-profile');
        Object.assign(global, jobsProfile);

        // Mock buildSearchTemplatePlan to test fallback behavior
        global.buildSearchTemplatePlan = null;

        // Require the module under test
        lib = require('../extension/lib/search-runtime-builders');
    });

    afterEach(() => {
        // Clean up globals
        delete global.normalizeAreaPreset;
        delete global.buildConnectQueryFromTags;
        delete global.buildSearchTemplatePlan;
        delete global.countBooleanOperatorsSafe;
        delete global.normalizeCompanyAreaPreset;
        delete global.parseTextList;
        delete global.getCompanyAreaPresetDefaultQuery;
        delete global.sanitizeCompanySearchQuery;
        delete global.LinkedInConnectConfig;
        delete global.LinkedInConnectQuery;
        delete global.LinkedInCompanyQuery;
        delete global.LinkedInJobsProfile;
    });

    describe('contract', () => {
        test('exports all 6 expected functions', () => {
            expect(typeof lib.normalizeTemplateMeta).toBe('function');
            expect(typeof lib.normalizeRuntimeAreaPreset).toBe('function');
            expect(typeof lib.mergeLogWithTemplateMeta).toBe('function');
            expect(typeof lib.buildQueryFromTags).toBe('function');
            expect(typeof lib.buildConnectSearchRuntimeFromState).toBe('function');
            expect(typeof lib.buildCompanySearchRuntimeFromState).toBe('function');
        });

        test('exports are frozen', () => {
            expect(Object.isFrozen(lib)).toBe(true);
        });
    });

    describe('normalizeTemplateMeta', () => {
        test('normalizes a full meta object', () => {
            const meta = {
                templateId: 'tmpl-123',
                usageGoal: 'recruiting',
                expectedResultsBucket: '100-500',
                operatorCount: 5,
                compiledQueryLength: 150,
                mode: 'connect'
            };
            const result = lib.normalizeTemplateMeta(meta);
            expect(result).toEqual({
                templateId: 'tmpl-123',
                usageGoal: 'recruiting',
                expectedResultsBucket: '100-500',
                operatorCount: 5,
                compiledQueryLength: 150,
                mode: 'connect'
            });
        });

        test('fills missing fields with defaults', () => {
            const meta = { templateId: 'tmpl-456' };
            const result = lib.normalizeTemplateMeta(meta);
            expect(result).toEqual({
                templateId: 'tmpl-456',
                usageGoal: '',
                expectedResultsBucket: '',
                operatorCount: 0,
                compiledQueryLength: 0,
                mode: 'connect'
            });
        });

        test('handles null input', () => {
            const result = lib.normalizeTemplateMeta(null);
            expect(result).toEqual({
                templateId: '',
                usageGoal: '',
                expectedResultsBucket: '',
                operatorCount: 0,
                compiledQueryLength: 0,
                mode: 'connect'
            });
        });

        test('respects provided mode parameter', () => {
            const meta = { templateId: 'tmpl-789' };
            const result = lib.normalizeTemplateMeta(meta, 'companies');
            expect(result.mode).toBe('companies');
        });

        test('prefers provided mode over meta.mode', () => {
            const meta = { templateId: 'tmpl-789', mode: 'connect' };
            const result = lib.normalizeTemplateMeta(meta, 'companies');
            expect(result.mode).toBe('companies');
        });

        test('clamps operatorCount to non-negative', () => {
            const meta = { operatorCount: -5 };
            const result = lib.normalizeTemplateMeta(meta);
            expect(result.operatorCount).toBe(0);
        });

        test('clamps compiledQueryLength to non-negative', () => {
            const meta = { compiledQueryLength: -10 };
            const result = lib.normalizeTemplateMeta(meta);
            expect(result.compiledQueryLength).toBe(0);
        });
    });

    describe('normalizeRuntimeAreaPreset', () => {
        test('returns "custom" for null/undefined when normalizeAreaPreset not available', () => {
            global.normalizeAreaPreset = undefined;
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            expect(lib.normalizeRuntimeAreaPreset(null)).toBe('custom');
            expect(lib.normalizeRuntimeAreaPreset(undefined)).toBe('custom');
        });

        test('returns provided value when no normalizeAreaPreset function', () => {
            global.normalizeAreaPreset = undefined;
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            expect(lib.normalizeRuntimeAreaPreset('sales')).toBe('sales');
        });

        test('delegates to normalizeAreaPreset when available', () => {
            global.normalizeAreaPreset = jest.fn(val => `normalized-${val}`);
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            expect(lib.normalizeRuntimeAreaPreset('test')).toBe('normalized-test');
            expect(global.normalizeAreaPreset).toHaveBeenCalledWith('test');
        });
    });

    describe('mergeLogWithTemplateMeta', () => {
        test('merges meta into each log entry', () => {
            const log = [
                { id: 1, templateId: '' },
                { id: 2, templateId: 'existing' }
            ];
            const templateMeta = {
                templateId: 'tmpl-999',
                usageGoal: 'sourcing',
                expectedResultsBucket: '50-100',
                operatorCount: 3,
                compiledQueryLength: 80,
                mode: 'connect'
            };
            const result = lib.mergeLogWithTemplateMeta(log, templateMeta);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[0].templateId).toBe('tmpl-999');
            expect(result[0].usageGoal).toBe('sourcing');
            expect(result[1].id).toBe(2);
            expect(result[1].templateId).toBe('existing');
        });

        test('returns empty array for null log', () => {
            const result = lib.mergeLogWithTemplateMeta(null, {});
            expect(result).toEqual([]);
        });

        test('returns empty array for empty log', () => {
            const result = lib.mergeLogWithTemplateMeta([], {});
            expect(result).toEqual([]);
        });

        test('preserves existing numeric operatorCount and compiledQueryLength', () => {
            const log = [
                { id: 1, operatorCount: 5, compiledQueryLength: 100 }
            ];
            const templateMeta = {
                templateId: '',
                usageGoal: '',
                expectedResultsBucket: '',
                operatorCount: 2,
                compiledQueryLength: 50,
                mode: 'connect'
            };
            const result = lib.mergeLogWithTemplateMeta(log, templateMeta);
            expect(result[0].operatorCount).toBe(5);
            expect(result[0].compiledQueryLength).toBe(100);
        });

        test('uses fallback for undefined numeric fields', () => {
            const log = [
                { id: 1, operatorCount: undefined, compiledQueryLength: undefined }
            ];
            const templateMeta = {
                templateId: '',
                usageGoal: '',
                expectedResultsBucket: '',
                operatorCount: 3,
                compiledQueryLength: 75,
                mode: 'connect'
            };
            const result = lib.mergeLogWithTemplateMeta(log, templateMeta);
            expect(result[0].operatorCount).toBe(3);
            expect(result[0].compiledQueryLength).toBe(75);
        });
    });

    describe('buildQueryFromTags', () => {
        test('uses customQuery when useCustomQuery=true', () => {
            const state = {
                useCustomQuery: true,
                customQuery: 'my custom query',
                tags: {}
            };
            expect(lib.buildQueryFromTags(state)).toBe('my custom query');
        });

        test('ignores customQuery when useCustomQuery is false', () => {
            const state = {
                useCustomQuery: false,
                customQuery: 'my custom query',
                tags: { role: ['engineer'] }
            };
            const result = lib.buildQueryFromTags(state);
            expect(result).not.toBe('my custom query');
            expect(result).toContain('engineer');
        });

        test('builds query from tags fallback', () => {
            const state = {
                useCustomQuery: false,
                customQuery: '',
                tags: {
                    role: ['developer', 'architect'],
                    industry: ['tech'],
                    level: ['senior']
                },
                roleTermsLimit: 10,
                connectSearchLanguageMode: 'auto'
            };
            const result = lib.buildQueryFromTags(state);
            expect(result).toContain('developer');
            expect(result).toContain('OR');
            expect(result).toContain('tech');
            expect(result).toContain('senior');
        });

        test('respects roleTermsLimit', () => {
            const state = {
                tags: {
                    role: ['dev', 'architect', 'manager', 'lead'],
                    industry: [],
                    market: [],
                    level: []
                },
                roleTermsLimit: 2
            };
            const result = lib.buildQueryFromTags(state);
            // With roleTermsLimit=2, only first 2 roles should be in the OR
            const parts = result.split(' ');
            const orIndex = parts.indexOf('OR');
            expect(orIndex).toBeGreaterThanOrEqual(0);
        });

        test('handles empty tags', () => {
            const state = {
                useCustomQuery: false,
                tags: {},
                roleTermsLimit: 6
            };
            const result = lib.buildQueryFromTags(state);
            expect(result).toBe('');
        });

        test('delegates to buildConnectQueryFromTags when available', () => {
            global.buildConnectQueryFromTags = jest.fn(() => 'delegated-query');
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');

            const state = {
                tags: { role: ['engineer'] },
                roleTermsLimit: 6,
                connectSearchLanguageMode: 'auto'
            };
            const result = lib.buildQueryFromTags(state);
            expect(result).toBe('delegated-query');
            expect(global.buildConnectQueryFromTags).toHaveBeenCalled();
        });

        test('fallback: single role produces plain term', () => {
            delete global.buildConnectQueryFromTags;
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            const state = { tags: { role: ['engineer'] }, roleTermsLimit: 6 };
            expect(lib.buildQueryFromTags(state)).toBe('engineer');
        });

        test('fallback: multiple roles joined with OR up to limit', () => {
            delete global.buildConnectQueryFromTags;
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            const state = {
                tags: { role: ['a', 'b', 'c', 'd'], industry: ['tech'], level: ['senior'] },
                roleTermsLimit: 2
            };
            const result = lib.buildQueryFromTags(state);
            expect(result).toContain('a OR b');
            expect(result).toContain('tech');
            expect(result).toContain('senior');
            expect(result).not.toContain(' c');
        });

        test('fallback: empty tags returns empty string', () => {
            delete global.buildConnectQueryFromTags;
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');
            expect(lib.buildQueryFromTags({ tags: {}, roleTermsLimit: 6 })).toBe('');
        });
    });

    describe('buildConnectSearchRuntimeFromState', () => {
        test('returns object with expected structure', () => {
            const state = {
                areaPreset: 'sales',
                connectUsageGoal: 'recruiting',
                connectExpectedResults: '100-500',
                connectSearchLanguageMode: 'en',
                connectTemplateAuto: true,
                connectTemplateId: 'tmpl-123',
                roleTermsLimit: 6,
                tags: { role: ['engineer'] },
                useCustomQuery: false,
                customQuery: ''
            };
            const result = lib.buildConnectSearchRuntimeFromState(state);
            expect(result).toHaveProperty('areaPreset');
            expect(result).toHaveProperty('query');
            expect(result).toHaveProperty('filterSpec');
            expect(result).toHaveProperty('templateMeta');
        });

        test('handles null state gracefully', () => {
            const result = lib.buildConnectSearchRuntimeFromState(null);
            expect(result).toHaveProperty('areaPreset');
            expect(result).toHaveProperty('query');
            expect(result).toHaveProperty('filterSpec');
            expect(result).toHaveProperty('templateMeta');
        });

        test('uses customQuery when useCustomQuery=true', () => {
            const state = {
                tags: { role: ['engineer'] },
                useCustomQuery: true,
                customQuery: 'my custom linkedin query',
                connectSearchLanguageMode: 'auto',
                roleTermsLimit: 6
            };
            const result = lib.buildConnectSearchRuntimeFromState(state);
            expect(result.query).toBe('my custom linkedin query');
        });

        test('builds query from tags as fallback', () => {
            const state = {
                tags: { role: ['developer'] },
                useCustomQuery: false,
                customQuery: '',
                connectSearchLanguageMode: 'auto',
                roleTermsLimit: 6
            };
            const result = lib.buildConnectSearchRuntimeFromState(state);
            expect(result.query).toContain('developer');
        });

        test('normalizes areaPreset', () => {
            const state = { areaPreset: 'sales', tags: {} };
            const result = lib.buildConnectSearchRuntimeFromState(state);
            expect(result.areaPreset).toBeDefined();
        });

        test('creates templateMeta with correct mode', () => {
            const state = { tags: {} };
            const result = lib.buildConnectSearchRuntimeFromState(state);
            expect(result.templateMeta.mode).toBe('connect');
        });
    });

    describe('buildCompanySearchRuntimeFromState', () => {
        test('returns object with expected structure', () => {
            const state = {
                companyAreaPreset: 'tech',
                companyUsageGoal: 'sales',
                companyExpectedResults: '10-50',
                companySearchLanguageMode: 'en',
                companyTemplateAuto: true,
                companyTemplateId: 'comp-123',
                companyQuery: 'software company',
                targetCompanies: ['Google', 'Meta']
            };
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(result).toHaveProperty('companyAreaPreset');
            expect(result).toHaveProperty('query');
            expect(result).toHaveProperty('targetCompanies');
            expect(result).toHaveProperty('filterSpec');
            expect(result).toHaveProperty('templateMeta');
        });

        test('handles null state gracefully', () => {
            const result = lib.buildCompanySearchRuntimeFromState(null);
            expect(result).toHaveProperty('companyAreaPreset');
            expect(result).toHaveProperty('query');
            expect(result).toHaveProperty('targetCompanies');
            expect(result).toHaveProperty('filterSpec');
            expect(result).toHaveProperty('templateMeta');
        });

        test('parses targetCompanies list', () => {
            const state = {
                targetCompanies: ['Google', 'Meta', 'Apple'],
                companyQuery: ''
            };
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(Array.isArray(result.targetCompanies)).toBe(true);
        });

        test('handles string targetCompanies (newline-separated)', () => {
            const state = {
                targetCompanies: 'Google\nMeta\nApple',
                companyQuery: ''
            };
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(Array.isArray(result.targetCompanies)).toBe(true);
            expect(result.targetCompanies.length).toBeGreaterThan(0);
        });

        test('sanitizes company query', () => {
            const state = {
                companyQuery: 'test query',
                targetCompanies: []
            };
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(typeof result.query).toBe('string');
        });

        test('uses default query when none provided', () => {
            global.getCompanyAreaPresetDefaultQuery = jest.fn(() => 'default-company-query');
            delete require.cache[require.resolve('../extension/lib/search-runtime-builders')];
            lib = require('../extension/lib/search-runtime-builders');

            const state = {
                companyAreaPreset: 'tech',
                companyQuery: '',
                targetCompanies: []
            };
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(result.query).toBe('default-company-query');
        });

        test('creates templateMeta with correct mode', () => {
            const state = {};
            const result = lib.buildCompanySearchRuntimeFromState(state);
            expect(result.templateMeta.mode).toBe('companies');
        });
    });
});
