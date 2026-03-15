/**
 * @jest-environment jsdom
 */

describe('jobs career parser', () => {
    function loadParser() {
        jest.resetModules();
        global.crypto = require('crypto').webcrypto;
        global.LinkedInJobsCareerIntelligence = require(
            '../extension/lib/jobs-career-intelligence'
        );
        global.LinkedInJobsCareerVault = require(
            '../extension/lib/jobs-career-vault'
        );
        return require('../extension/lib/jobs-career-parser');
    }

    afterEach(() => {
        delete global.LinkedInJobsCareerIntelligence;
        delete global.LinkedInJobsCareerVault;
        delete global.mammoth;
        delete global.chrome;
        delete global.crypto;
    });

    it('rejects unsupported legacy doc files before parsing', async () => {
        const { parseResumeFile } = loadParser();
        const file = new File(['legacy'], 'resume.doc', {
            type: 'application/msword'
        });

        await expect(parseResumeFile(file)).rejects.toThrow(
            'unsupported-file-type'
        );
    });

    it('extracts docx text, sanitizes it, and returns hashed metadata', async () => {
        const { parseResumeFile } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async ({ arrayBuffer }) => {
                expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
                return {
                    value: 'Senior   Engineer\n\nReact   Node.js'
                };
            })
        };

        const file = new File(
            [new Uint8Array([1, 2, 3, 4])],
            'resume.docx',
            {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
        );
        const parsed = await parseResumeFile(file);

        expect(parsed.fileName).toBe('resume.docx');
        expect(parsed.extension).toBe('docx');
        expect(parsed.size).toBe(file.size);
        expect(parsed.extractedText).toBe('Senior Engineer React Node.js');
        expect(parsed.sha256).toHaveLength(64);
        expect(parsed.id).toBe(parsed.sha256);
        expect(parsed.arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('fails docx extraction when the mammoth parser is unavailable', async () => {
        const { extractTextFromDocx } = loadParser();

        await expect(
            extractTextFromDocx(new Uint8Array([1, 2]).buffer)
        ).rejects.toThrow('DOCX parser unavailable');
    });

    it('sanitizes null/undefined/whitespace text values', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: '  Hello   World  '
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('Hello World');
    });

    it('handles empty docx extraction result', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: ''
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('');
    });

    it('handles docx with null result value', async () => {
        const { extractTextFromDocx } = loadParser();
        global.mammoth = {
            extractRawText: jest.fn(async () => ({
                value: null
            }))
        };

        const text = await extractTextFromDocx(
            new Uint8Array([1]).buffer
        );
        expect(text).toBe('');
    });

    it('rejects oversized files before parsing', async () => {
        const { parseResumeFile } = loadParser();
        const buffer = new ArrayBuffer(6 * 1024 * 1024);
        const file = new File([buffer], 'huge.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

        await expect(parseResumeFile(file)).rejects.toThrow();
    });
});
