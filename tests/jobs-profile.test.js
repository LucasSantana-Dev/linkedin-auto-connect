'use strict';

const {
    parseExcludedCompanyList,
    parseTextList,
    normalizeJobsRuntimeProfile,
    mergeJobsRuntimeProfiles
} = require('../extension/lib/jobs-profile');

describe('jobs-profile contract', () => {
    it('exports all expected functions', () => {
        expect(typeof parseExcludedCompanyList).toBe('function');
        expect(typeof parseTextList).toBe('function');
        expect(typeof normalizeJobsRuntimeProfile).toBe('function');
        expect(typeof mergeJobsRuntimeProfiles).toBe('function');
    });

    it('freezes the public API', () => {
        const lib = require('../extension/lib/jobs-profile');
        expect(Object.isFrozen(lib)).toBe(true);
    });
});

describe('parseExcludedCompanyList', () => {
    it('handles array input with trimming', () => {
        const result = parseExcludedCompanyList(['  Apple  ', 'Google', '  Microsoft  ']);
        expect(result).toEqual(['Apple', 'Google', 'Microsoft']);
    });

    it('handles string input with newline splitting', () => {
        const result = parseExcludedCompanyList('Apple\nGoogle\nMicrosoft');
        expect(result).toEqual(['Apple', 'Google', 'Microsoft']);
    });

    it('filters empty strings from array', () => {
        const result = parseExcludedCompanyList(['Apple', '', 'Google', null, 'Microsoft']);
        expect(result).toEqual(['Apple', 'Google', 'Microsoft']);
    });

    it('filters empty strings from newline-split string', () => {
        const result = parseExcludedCompanyList('Apple\n\nGoogle\n  \nMicrosoft');
        expect(result).toEqual(['Apple', 'Google', 'Microsoft']);
    });

    it('handles null input', () => {
        const result = parseExcludedCompanyList(null);
        expect(result).toEqual([]);
    });

    it('handles undefined input', () => {
        const result = parseExcludedCompanyList(undefined);
        expect(result).toEqual([]);
    });

    it('handles empty string input', () => {
        const result = parseExcludedCompanyList('');
        expect(result).toEqual([]);
    });

    it('handles empty array', () => {
        const result = parseExcludedCompanyList([]);
        expect(result).toEqual([]);
    });

    it('converts non-string array items to strings', () => {
        const result = parseExcludedCompanyList([123, 'Google', true, 'Apple']);
        expect(result).toEqual(['123', 'Google', 'true', 'Apple']);
    });

    it('handles whitespace-only strings in array', () => {
        const result = parseExcludedCompanyList(['Apple', '   ', 'Google']);
        expect(result).toEqual(['Apple', 'Google']);
    });

    it('handles Windows line breaks', () => {
        const result = parseExcludedCompanyList('Apple\r\nGoogle\r\nMicrosoft');
        expect(result).toContain('Apple');
    });
});

describe('parseTextList', () => {
    it('handles array input with trimming', () => {
        const result = parseTextList(['  item1  ', 'item2', '  item3  ']);
        expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('handles string input with newline splitting', () => {
        const result = parseTextList('item1\nitem2\nitem3');
        expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('filters empty strings from array', () => {
        const result = parseTextList(['item1', '', 'item2', null, 'item3']);
        expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('filters empty strings from newline-split string', () => {
        const result = parseTextList('item1\n\nitem2\n  \nitem3');
        expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('handles null input', () => {
        const result = parseTextList(null);
        expect(result).toEqual([]);
    });

    it('handles undefined input', () => {
        const result = parseTextList(undefined);
        expect(result).toEqual([]);
    });

    it('handles empty string', () => {
        const result = parseTextList('');
        expect(result).toEqual([]);
    });

    it('handles empty array', () => {
        const result = parseTextList([]);
        expect(result).toEqual([]);
    });

    it('converts non-string array items to strings (falsy values become empty)', () => {
        const result = parseTextList([42, 'text', false, 'more']);
        // false gets coerced to empty string by the (s || '') pattern
        expect(result).toEqual(['42', 'text', 'more']);
    });
});

describe('normalizeJobsRuntimeProfile', () => {
    it('returns empty object for null input', () => {
        const result = normalizeJobsRuntimeProfile(null);
        expect(result).toEqual({});
    });

    it('returns empty object for undefined input', () => {
        const result = normalizeJobsRuntimeProfile(undefined);
        expect(result).toEqual({});
    });

    it('returns empty object for non-object input', () => {
        const result = normalizeJobsRuntimeProfile('not an object');
        expect(result).toEqual({});
    });

    it('normalizes string values by trimming', () => {
        const profile = {
            headline: '  Senior Engineer  ',
            location: '  San Francisco  '
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            headline: 'Senior Engineer',
            location: 'San Francisco'
        });
    });

    it('normalizes array values by trimming and filtering', () => {
        const profile = {
            skills: ['  React  ', '  Node.js  ', '  '],
            experience: ['Senior Role', '', 'Junior Role']
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            skills: ['React', 'Node.js'],
            experience: ['Senior Role', 'Junior Role']
        });
    });

    it('filters out null and undefined values', () => {
        const profile = {
            headline: 'Engineer',
            skills: null,
            location: undefined,
            company: 'Acme'
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            headline: 'Engineer',
            company: 'Acme'
        });
    });

    it('filters out empty string values', () => {
        const profile = {
            headline: 'Engineer',
            location: '',
            company: 'Acme'
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            headline: 'Engineer',
            company: 'Acme'
        });
    });

    it('filters out empty array values', () => {
        const profile = {
            skills: [],
            experience: ['Role1'],
            headline: 'Engineer'
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            experience: ['Role1'],
            headline: 'Engineer'
        });
    });

    it('handles whitespace-only strings as empty', () => {
        const profile = {
            headline: '   ',
            location: 'San Francisco'
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual({
            location: 'San Francisco'
        });
    });

    it('converts non-string array items to strings', () => {
        const profile = {
            skills: [123, 'React', true]
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result.skills).toContain('123');
        expect(result.skills).toContain('React');
        expect(result.skills).toContain('true');
    });

    it('handles mixed types in values', () => {
        const profile = {
            headline: 42,
            skills: ['React', 99],
            flag: true
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result.headline).toBe('42');
        expect(result.flag).toBe('true');
        expect(result.skills).toContain('99');
    });

    it('preserves non-empty profile structure', () => {
        const profile = {
            headline: 'Senior Engineer',
            location: 'Remote',
            skills: ['JavaScript', 'Python'],
            company: 'Tech Corp'
        };
        const result = normalizeJobsRuntimeProfile(profile);
        expect(result).toEqual(profile);
    });
});

describe('mergeJobsRuntimeProfiles', () => {
    it('returns copy of base when overlay is null', () => {
        const base = { headline: 'Engineer', company: 'Acme' };
        const result = mergeJobsRuntimeProfiles(base, null);
        expect(result).toEqual(base);
        expect(result).not.toBe(base); // should be a copy
    });

    it('returns copy of base when overlay is undefined', () => {
        const base = { headline: 'Engineer', company: 'Acme' };
        const result = mergeJobsRuntimeProfiles(base, undefined);
        expect(result).toEqual(base);
        expect(result).not.toBe(base);
    });

    it('returns empty object when both are null/undefined', () => {
        const result = mergeJobsRuntimeProfiles(null, null);
        expect(result).toEqual({});
    });

    it('overlay string values shadow base', () => {
        const base = { headline: 'Engineer', company: 'Acme' };
        const overlay = { headline: 'Senior Engineer' };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.headline).toBe('Senior Engineer');
        expect(result.company).toBe('Acme');
    });

    it('overlay array values shadow base arrays', () => {
        const base = { skills: ['React', 'Node.js'] };
        const overlay = { skills: ['Python', 'Go'] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.skills).toEqual(['Python', 'Go']);
    });

    it('overlay empty strings do not remove base values', () => {
        const base = { headline: 'Engineer', location: 'SF' };
        const overlay = { headline: '' };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        // Empty overlay strings are trimmed to empty and filtered out, so base value remains
        expect(result).toEqual({ headline: 'Engineer', location: 'SF' });
    });

    it('overlay empty arrays do not remove base arrays', () => {
        const base = { skills: ['React'], other: 'value' };
        const overlay = { skills: [] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        // Empty overlay arrays are filtered out, so base value remains
        expect(result).toEqual({ skills: ['React'], other: 'value' });
    });

    it('overlay null/undefined values are ignored', () => {
        const base = { headline: 'Engineer', company: 'Acme' };
        const overlay = { headline: null, company: undefined };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result).toEqual(base);
    });

    it('adds new keys from overlay', () => {
        const base = { headline: 'Engineer' };
        const overlay = { location: 'San Francisco', skills: ['React'] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result).toEqual({
            headline: 'Engineer',
            location: 'San Francisco',
            skills: ['React']
        });
    });

    it('normalizes overlay string values with trimming', () => {
        const base = { headline: 'Engineer' };
        const overlay = { location: '  San Francisco  ' };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.location).toBe('San Francisco');
    });

    it('normalizes overlay array values with trimming', () => {
        const base = { skills: [] };
        const overlay = { skills: ['  React  ', '  Node.js  '] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.skills).toEqual(['React', 'Node.js']);
    });

    it('complex merge scenario: multiple adds + some shadows', () => {
        const base = {
            headline: 'Engineer',
            company: 'Acme',
            skills: ['React']
        };
        const overlay = {
            headline: 'Senior Engineer',
            location: 'Remote',
            skills: ['React', 'Python']
        };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result).toEqual({
            headline: 'Senior Engineer',
            company: 'Acme',
            location: 'Remote',
            skills: ['React', 'Python']
        });
    });

    it('overlay with non-object is treated as empty', () => {
        const base = { headline: 'Engineer' };
        const result = mergeJobsRuntimeProfiles(base, 'not an object');
        expect(result).toEqual(base);
    });

    it('base with non-object gets iterated with Object.entries', () => {
        const overlay = { headline: 'Engineer' };
        const result = mergeJobsRuntimeProfiles('not an object', overlay);
        // Object.entries on a string creates entries for each character index, then overlay is merged
        expect(result.headline).toBe('Engineer');
        expect(result['0']).toBe('n'); // first character is at index 0
    });

    it('handles whitespace-only overlay strings as empty (not applied)', () => {
        const base = { headline: 'Engineer', location: 'SF' };
        const overlay = { headline: '   ' };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        // Whitespace-only strings are trimmed to empty and filtered out, so base value remains
        expect(result).toEqual({ headline: 'Engineer', location: 'SF' });
    });

    it('overlay whitespace-only array items are filtered', () => {
        const base = { skills: ['React'] };
        const overlay = { skills: ['  ', 'Python', '   '] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.skills).toEqual(['Python']);
    });

    it('converts overlay array items to strings', () => {
        const base = {};
        const overlay = { skills: [1, 'React', true] };
        const result = mergeJobsRuntimeProfiles(base, overlay);
        expect(result.skills).toContain('1');
        expect(result.skills).toContain('React');
        expect(result.skills).toContain('true');
    });

    it('both base and overlay empty objects', () => {
        const result = mergeJobsRuntimeProfiles({}, {});
        expect(result).toEqual({});
    });
});
