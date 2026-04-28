(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsProfile = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        /**
         * Parse a list of excluded companies from raw input.
         * Handles both array and string inputs, splits on newlines, and trims/deduplicates.
         * Falls back to optional parseExcludedCompanies function if available.
         * @param {string|Array} raw - Raw input (string or array)
         * @returns {string[]} Trimmed, non-empty company names
         */
        function parseExcludedCompanyList(raw) {
            if (typeof parseExcludedCompanies === 'function') {
                return parseExcludedCompanies(raw);
            }
            if (Array.isArray(raw)) {
                return raw.map(s => String(s || '').trim())
                    .filter(Boolean);
            }
            return String(raw || '')
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);
        }

        /**
         * Parse a generic text list from raw input.
         * Handles both array and string inputs, splits on newlines, and trims.
         * @param {string|Array} raw - Raw input (string or array)
         * @returns {string[]} Trimmed, non-empty text items
         */
        function parseTextList(raw) {
            if (Array.isArray(raw)) {
                return raw.map(s => String(s || '').trim())
                    .filter(Boolean);
            }
            return String(raw || '')
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);
        }

        /**
         * Normalize a jobs runtime profile by trimming, filtering null/empty values,
         * and converting all values to strings or string arrays.
         * Falls back to optional normalizeStructuredProfile function if available.
         * @param {Object} profile - Raw profile object
         * @returns {Object} Normalized profile with trimmed, non-empty values
         */
        function normalizeJobsRuntimeProfile(profile) {
            if (typeof normalizeStructuredProfile === 'function') {
                return normalizeStructuredProfile(profile || {});
            }
            const source = profile && typeof profile === 'object'
                ? profile
                : {};
            const normalized = {};
            for (const [key, value] of Object.entries(source)) {
                if (value == null) continue;
                if (Array.isArray(value)) {
                    const list = value.map(item => String(item || '').trim())
                        .filter(Boolean);
                    if (list.length > 0) normalized[key] = list;
                    continue;
                }
                const text = String(value).trim();
                if (text) normalized[key] = text;
            }
            return normalized;
        }

        /**
         * Merge two jobs runtime profiles with overlay taking precedence.
         * Applies the same normalization logic as normalizeJobsRuntimeProfile.
         * @param {Object} base - Base profile
         * @param {Object} overlay - Overlay profile to merge in
         * @returns {Object} Merged profile with overlay values shadowing base
         */
        function mergeJobsRuntimeProfiles(base, overlay) {
            const merged = { ...(base || {}) };
            const patch = overlay && typeof overlay === 'object'
                ? overlay
                : {};
            for (const [key, value] of Object.entries(patch)) {
                if (value == null) continue;
                if (Array.isArray(value)) {
                    const list = value.map(item => String(item || '').trim())
                        .filter(Boolean);
                    if (list.length > 0) merged[key] = list;
                    continue;
                }
                const text = String(value).trim();
                if (text) merged[key] = text;
            }
            return merged;
        }

        return Object.freeze({
            parseExcludedCompanyList,
            parseTextList,
            normalizeJobsRuntimeProfile,
            mergeJobsRuntimeProfiles
        });
    }
);
