function createIndexedDbMock() {
    let hasStore = false;
    const records = new Map();

    function createAsyncRequest(run, tx) {
        const request = {};
        queueMicrotask(() => {
            const result = run();
            request.result = result;
            request.onsuccess?.({ target: request });
            queueMicrotask(() => tx.oncomplete?.());
        });
        return request;
    }

    const db = {
        objectStoreNames: {
            contains(name) {
                return hasStore && name === 'documents';
            }
        },
        createObjectStore(name) {
            if (name === 'documents') {
                hasStore = true;
            }
            return {};
        },
        transaction() {
            const tx = {
                onerror: null,
                oncomplete: null,
                objectStore() {
                    return {
                        put(value) {
                            return createAsyncRequest(() => {
                                records.set(value.id, value);
                                return value;
                            }, tx);
                        },
                        getAll() {
                            return createAsyncRequest(
                                () => Array.from(records.values()),
                                tx
                            );
                        },
                        delete(id) {
                            return createAsyncRequest(() => {
                                records.delete(id);
                                return undefined;
                            }, tx);
                        },
                        clear() {
                            return createAsyncRequest(() => {
                                records.clear();
                                return undefined;
                            }, tx);
                        }
                    };
                }
            };
            return tx;
        },
        close() {}
    };

    return {
        open() {
            const request = {};
            queueMicrotask(() => {
                request.result = db;
                if (!hasStore) {
                    request.onupgradeneeded?.();
                }
                request.onsuccess?.();
            });
            return request;
        }
    };
}

const {
    DB_NAME,
    STORE_NAME,
    sha256Hex,
    upsertJobsCareerVaultDocument,
    listJobsCareerVaultDocuments,
    loadJobsCareerVaultDocuments,
    removeJobsCareerVaultDocument,
    clearJobsCareerVault
} = require('../extension/lib/jobs-career-vault');

describe('jobs career vault', () => {
    const indexedDbApi = createIndexedDbMock();
    const record = {
        id: 'resume-1',
        fileName: 'resume.docx',
        extension: 'docx',
        size: 128,
        sha256: 'abc123',
        extractedText: 'Senior Engineer React Node.js',
        arrayBuffer: new Uint8Array([1, 2, 3, 4]).buffer
    };

    it('exposes stable vault metadata', () => {
        expect(DB_NAME).toBe('linkedinEngageJobsVaultV1');
        expect(STORE_NAME).toBe('documents');
    });

    it('hashes binary content deterministically', async () => {
        const digest = await sha256Hex(new Uint8Array([1, 2, 3]).buffer);

        expect(digest).toHaveLength(64);
        expect(digest).toBe(
            '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81'
        );
    });

    it('produces consistent hash for the same input', async () => {
        const input = new Uint8Array([10, 20, 30]).buffer;
        const hash1 = await sha256Hex(input);
        const hash2 = await sha256Hex(input);
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64);
    });

    it('stores encrypted documents and loads decrypted metadata/text', async () => {
        const saved = await upsertJobsCareerVaultDocument(
            record,
            'career-passphrase',
            indexedDbApi
        );
        const listed = await listJobsCareerVaultDocuments(indexedDbApi);
        const loaded = await loadJobsCareerVaultDocuments(
            'career-passphrase',
            indexedDbApi
        );

        expect(saved.fileName).toBe(record.fileName);
        expect(saved.envelope).toEqual(
            expect.objectContaining({
                salt: expect.any(String),
                iv: expect.any(String),
                ciphertext: expect.any(String)
            })
        );
        expect(listed).toHaveLength(1);
        expect(listed[0].envelope.ciphertext).toEqual(expect.any(String));
        expect(JSON.stringify(listed[0])).not.toContain(record.extractedText);
        expect(loaded).toEqual([
            expect.objectContaining({
                id: 'resume-1',
                fileName: 'resume.docx',
                extractedText: 'Senior Engineer React Node.js'
            })
        ]);
    });

    it('records updatedAt timestamp on upsert', async () => {
        const saved = await upsertJobsCareerVaultDocument(
            record,
            'career-passphrase',
            indexedDbApi
        );
        expect(saved.updatedAt).toBeTruthy();
        expect(new Date(saved.updatedAt).getTime()).not.toBeNaN();
    });

    it('sanitizes null/undefined fields in saved records', async () => {
        const nullRecord = {
            ...record,
            id: 'resume-null',
            fileName: null,
            extension: undefined,
            sha256: null,
            size: null
        };
        const saved = await upsertJobsCareerVaultDocument(
            nullRecord,
            'career-passphrase',
            indexedDbApi
        );

        expect(saved.fileName).toBe('');
        expect(saved.extension).toBe('');
        expect(saved.sha256).toBe('');
        expect(saved.size).toBe(0);
    });

    it('removes and clears stored documents', async () => {
        await clearJobsCareerVault(indexedDbApi);
        await upsertJobsCareerVaultDocument(
            record,
            'career-passphrase',
            indexedDbApi
        );

        await removeJobsCareerVaultDocument('resume-1', indexedDbApi);
        expect(await listJobsCareerVaultDocuments(indexedDbApi)).toEqual([]);

        await upsertJobsCareerVaultDocument(
            { ...record, id: 'resume-2', sha256: 'def456' },
            'career-passphrase',
            indexedDbApi
        );
        await clearJobsCareerVault(indexedDbApi);

        expect(await listJobsCareerVaultDocuments(indexedDbApi)).toEqual([]);
    });

    it('fails to decrypt with wrong passphrase', async () => {
        await clearJobsCareerVault(indexedDbApi);
        await upsertJobsCareerVaultDocument(
            record,
            'correct-pass',
            indexedDbApi
        );

        await expect(
            loadJobsCareerVaultDocuments('wrong-pass', indexedDbApi)
        ).rejects.toThrow();
    });

    it('overwrites existing document on upsert with same id', async () => {
        await clearJobsCareerVault(indexedDbApi);
        await upsertJobsCareerVaultDocument(
            record,
            'career-passphrase',
            indexedDbApi
        );
        await upsertJobsCareerVaultDocument(
            { ...record, extractedText: 'Updated text' },
            'career-passphrase',
            indexedDbApi
        );

        const listed = await listJobsCareerVaultDocuments(indexedDbApi);
        expect(listed).toHaveLength(1);

        const loaded = await loadJobsCareerVaultDocuments(
            'career-passphrase',
            indexedDbApi
        );
        expect(loaded[0].extractedText).toBe('Updated text');
    });
});
