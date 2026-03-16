/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://www.linkedin.com/checkpoint/challenge/123"}
 */

const { detectChallenge } = require('../extension/lib/company-utils');

describe('detectChallenge URL branch', () => {
    beforeEach(() => {
        document.body.textContent = 'Normal page content without security text';
    });

    it('returns true when URL contains checkpoint (line 197 branch)', () => {
        // window.location.href is https://www.linkedin.com/checkpoint/challenge/123
        // Body text is normal — only URL triggers the branch
        expect(detectChallenge()).toBe(true);
    });
});
