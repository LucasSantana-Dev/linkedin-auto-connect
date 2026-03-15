(function(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsProfileImport = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function() {
        function textFrom(element) {
            return String(
                element?.innerText ||
                element?.textContent ||
                ''
            ).replace(/\s+/g, ' ').trim();
        }

        function listFrom(root, selectors, limit) {
            const seen = new Set();
            const out = [];
            root.querySelectorAll(selectors).forEach((element) => {
                const value = textFrom(element);
                const key = value.toLowerCase();
                if (!value || seen.has(key)) return;
                seen.add(key);
                out.push(value);
            });
            return out.slice(0, limit);
        }

        function extractLinkedInProfileForJobs(root) {
            const scope = root || document;
            return {
                headline: textFrom(scope.querySelector(
                    '.text-body-medium.break-words, ' +
                    '.pv-text-details__left-panel .text-body-medium'
                )),
                about: textFrom(scope.querySelector(
                    '#about ~ * .display-flex .full-width, ' +
                    '[data-generated-suggestion-target] span'
                )),
                location: textFrom(scope.querySelector(
                    '.text-body-small.inline.t-black--light.break-words, ' +
                    '.pv-text-details__left-panel .text-body-small'
                )),
                skills: listFrom(
                    scope,
                    '#skills + * span[aria-hidden=\"true\"], ' +
                    '[data-field=\"skill_assessment\"] span[aria-hidden=\"true\"]',
                    20
                ),
                experiences: listFrom(
                    scope,
                    '#experience + * span[aria-hidden=\"true\"], ' +
                    '[data-view-name=\"profile-component-entity\"] span[aria-hidden=\"true\"]',
                    20
                )
            };
        }

        return {
            extractLinkedInProfileForJobs
        };
    }
);
