(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInSearchRuntimeBuilders = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        function normalizeRuntimeAreaPreset(value) {
            if (typeof normalizeAreaPreset === 'function') {
                return normalizeAreaPreset(value);
            }
            return value || 'custom';
        }

        function normalizeTemplateMeta(meta, mode) {
            const source = meta && typeof meta === 'object'
                ? meta : {};
            const normalizedMode = String(mode || source.mode || '')
                .trim() || 'connect';
            return {
                templateId: String(source.templateId || ''),
                usageGoal: String(source.usageGoal || ''),
                expectedResultsBucket: String(
                    source.expectedResultsBucket || ''
                ),
                operatorCount: Math.max(
                    0,
                    Number(source.operatorCount) || 0
                ),
                compiledQueryLength: Math.max(
                    0,
                    Number(source.compiledQueryLength) || 0
                ),
                mode: normalizedMode
            };
        }


        function mergeLogWithTemplateMeta(log, templateMeta) {
            const meta = normalizeTemplateMeta(
                templateMeta,
                templateMeta?.mode
            );
            if (!Array.isArray(log) || log.length === 0) {
                return [];
            }
            return log.map(entry => ({
                ...entry,
                templateId: entry?.templateId || meta.templateId,
                usageGoal: entry?.usageGoal || meta.usageGoal,
                expectedResultsBucket:
                    entry?.expectedResultsBucket ||
                    meta.expectedResultsBucket,
                operatorCount: Number.isFinite(entry?.operatorCount)
                    ? entry.operatorCount
                    : meta.operatorCount,
                compiledQueryLength:
                    Number.isFinite(entry?.compiledQueryLength)
                        ? entry.compiledQueryLength
                        : meta.compiledQueryLength
            }));
        }

        function buildConnectSearchRuntimeFromState(state, forcedQuery) {
            const safeState = state && typeof state === 'object'
                ? state
                : {};
            const areaPreset = normalizeRuntimeAreaPreset(
                safeState.areaPreset
            );
            const usageGoal = String(
                safeState.connectUsageGoal || ''
            ).trim();
            const expectedResultsBucket = String(
                safeState.connectExpectedResults || ''
            ).trim();
            const searchLanguageMode = String(
                safeState.connectSearchLanguageMode || ''
            ).trim();
            const auto = safeState.connectTemplateAuto !== false;
            const templateId = String(
                safeState.connectTemplateId || ''
            ).trim();
            const roleTermsLimit = Math.max(
                1,
                Math.min(
                    10,
                    parseInt(safeState.roleTermsLimit, 10) || 6
                )
            );

            const selectedTags = safeState.tags || {};
            const useCustomQuery = !!safeState.useCustomQuery;
            const customQuery = String(
                safeState.customQuery || ''
            ).trim();
            const preferredQuery = String(forcedQuery || '').trim();

            let plan = null;
            if (typeof buildSearchTemplatePlan === 'function') {
                plan = buildSearchTemplatePlan({
                    mode: 'connect',
                    areaPreset,
                    usageGoal,
                    expectedResultsBucket,
                    auto,
                    templateId,
                    searchLanguageMode,
                    selectedTags,
                    roleTermsLimit
                });
            }

            const fallbackQuery = buildQueryFromTags(safeState);
            const templateQuery = String(plan?.query || '').trim();
            let query = preferredQuery || templateQuery || fallbackQuery;
            if (useCustomQuery && customQuery) {
                query = customQuery;
            }
            query = String(query || '').trim();

            const fallbackMeta = {
                templateId,
                usageGoal,
                expectedResultsBucket,
                resolvedSearchLocale:
                    plan?.meta?.resolvedSearchLocale || '',
                operatorCount: countBooleanOperatorsSafe(query),
                compiledQueryLength: query.length,
                mode: 'connect'
            };
            return {
                areaPreset,
                query,
                filterSpec: plan?.filterSpec || {},
                templateMeta: normalizeTemplateMeta(
                    plan?.meta || fallbackMeta,
                    'connect'
                )
            };
        }

        function buildCompanySearchRuntimeFromState(state) {
            const safeState = state && typeof state === 'object'
                ? state
                : {};
            const companyAreaPreset =
                typeof normalizeCompanyAreaPreset === 'function'
                    ? normalizeCompanyAreaPreset(
                        safeState.companyAreaPreset
                    )
                    : (safeState.companyAreaPreset || 'custom');
            const usageGoal = String(
                safeState.companyUsageGoal || ''
            ).trim();
            const expectedResultsBucket = String(
                safeState.companyExpectedResults || ''
            ).trim();
            const searchLanguageMode = String(
                safeState.companySearchLanguageMode || ''
            ).trim();
            const auto = safeState.companyTemplateAuto !== false;
            const templateId = String(
                safeState.companyTemplateId || ''
            ).trim();
            const manualQuery = String(
                safeState.companyQuery || ''
            ).trim();

            let plan = null;
            if (typeof buildSearchTemplatePlan === 'function') {
                plan = buildSearchTemplatePlan({
                    mode: 'companies',
                    areaPreset: companyAreaPreset,
                    usageGoal,
                    expectedResultsBucket,
                    auto,
                    templateId,
                    searchLanguageMode,
                    manualQuery
                });
            }

            const targetCompanies = parseTextList(
                safeState.targetCompanies
            );

            let query = String(plan?.query || '').trim() || manualQuery;
            if (!query &&
                typeof getCompanyAreaPresetDefaultQuery === 'function') {
                query = getCompanyAreaPresetDefaultQuery(
                    companyAreaPreset
                );
            }
            query = sanitizeCompanySearchQuery(query);

            const fallbackMeta = {
                templateId,
                usageGoal,
                expectedResultsBucket,
                resolvedSearchLocale:
                    plan?.meta?.resolvedSearchLocale || '',
                operatorCount: countBooleanOperatorsSafe(query),
                compiledQueryLength: query.length,
                mode: 'companies'
            };
            return {
                companyAreaPreset,
                query,
                targetCompanies,
                filterSpec: plan?.filterSpec || {},
                templateMeta: normalizeTemplateMeta(
                    plan?.meta || fallbackMeta,
                    'companies'
                )
            };
        }

        function buildQueryFromTags(state) {
            if (state.useCustomQuery && state.customQuery) {
                return state.customQuery;
            }
            const tags = state.tags || {};
            const maxRoleTerms = Math.max(
                1,
                Math.min(10, parseInt(state.roleTermsLimit, 10) || 6)
            );
            if (typeof buildConnectQueryFromTags === 'function') {
                return buildConnectQueryFromTags(
                    tags,
                    maxRoleTerms,
                    state.connectSearchLanguageMode || 'auto'
                );
            }
            const roles = Array.isArray(tags.role) ? tags.role : [];
            const parts = [];
            if (roles.length === 1) parts.push(roles[0]);
            if (roles.length > 1) {
                parts.push(roles.slice(0, maxRoleTerms).join(' OR '));
            }
            ['industry', 'market', 'level'].forEach(group => {
                const values = Array.isArray(tags[group]) ? tags[group] : [];
                values.forEach(term => parts.push(term));
            });
            return parts.join(' ');
        }

        return Object.freeze({
            normalizeTemplateMeta,
            normalizeRuntimeAreaPreset,
            mergeLogWithTemplateMeta,
            buildQueryFromTags,
            buildConnectSearchRuntimeFromState,
            buildCompanySearchRuntimeFromState
        });
    }
);
