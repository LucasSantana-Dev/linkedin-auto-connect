'use strict';
const GlobalWorkerOptions = { workerSrc: '' };
function getDocument({ data }) {
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
module.exports = { getDocument, GlobalWorkerOptions, default: { getDocument, GlobalWorkerOptions } };
