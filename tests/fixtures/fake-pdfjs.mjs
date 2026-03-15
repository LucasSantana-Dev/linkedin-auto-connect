/**
 * Fake pdfjs fixture for Jest tests.
 * Provides a minimal getDocument + GlobalWorkerOptions API.
 */

export const GlobalWorkerOptions = { workerSrc: '' };

export function getDocument({ data }) {
    const pages = [
        { items: [{ str: 'Hello from page 1' }, { str: '  ' }, { str: 'More text' }] },
        { items: [{ str: 'Hello from page 2' }] }
    ];
    return {
        promise: Promise.resolve({
            numPages: pages.length,
            getPage: async (i) => ({
                getTextContent: async () => ({ items: pages[i - 1].items })
            })
        })
    };
}

export default { getDocument, GlobalWorkerOptions };
