(function(root, factory) {
    const api = factory(
        root.LinkedInJobsCareerIntelligence,
        root.LinkedInJobsCareerVault
    );
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LinkedInJobsCareerParser = api;
    Object.keys(api).forEach(function(key) {
        if (typeof root[key] === 'undefined') {
            root[key] = api[key];
        }
    });
})(
    typeof globalThis !== 'undefined' ? globalThis : this,
    function(careerIntel, careerVault) {
        let pdfJsPromise = null;
        let _pdfJsLoader = null;
        function _setPdfJsLoader(fn) { _pdfJsLoader = fn; pdfJsPromise = null; }

        function sanitizeText(value) {
            return String(value || '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        async function loadPdfJs() {
            if (pdfJsPromise) return pdfJsPromise;
            if (_pdfJsLoader) {
                pdfJsPromise = Promise.resolve(_pdfJsLoader());
                return pdfJsPromise;
            }
            pdfJsPromise = import(
                chrome.runtime.getURL('vendor/pdf.min.mjs')
            ).then((module) => {
                const pdfjs = module.default || module;
                pdfjs.GlobalWorkerOptions.workerSrc =
                    chrome.runtime.getURL('vendor/pdf.worker.min.mjs');
                return pdfjs;
            });
            return pdfJsPromise;
        }

        async function extractTextFromPdf(arrayBuffer) {
            const pdfjs = await loadPdfJs();
            const loadingTask = pdfjs.getDocument({
                data: arrayBuffer
            });
            const pdf = await loadingTask.promise;
            const parts = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                parts.push(
                    content.items
                        .map(item => sanitizeText(item.str))
                        .filter(Boolean)
                        .join(' ')
                );
            }
            return parts.join('\n\n').trim();
        }

        async function extractTextFromDocx(arrayBuffer) {
            if (!globalThis.mammoth?.extractRawText) {
                throw new Error('DOCX parser unavailable');
            }
            const result = await globalThis.mammoth.extractRawText({
                arrayBuffer
            });
            return sanitizeText(result?.value || '');
        }

        function readFileBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(
                    reader.error || new Error('Failed to read file')
                );
                reader.onload = () => resolve(reader.result);
                reader.readAsArrayBuffer(file);
            });
        }

        async function parseResumeFile(file) {
            const validation =
                careerIntel.validateResumeVaultFileMeta(file);
            if (!validation.ok) {
                throw new Error(validation.reason);
            }
            const arrayBuffer = await readFileBuffer(file);
            const extension = validation.extension;
            const extractedText = extension === 'pdf'
                ? await extractTextFromPdf(arrayBuffer)
                : await extractTextFromDocx(arrayBuffer);
            return {
                id: await careerVault.sha256Hex(arrayBuffer),
                fileName: String(file.name || ''),
                extension,
                size: Number(file.size) || 0,
                sha256: await careerVault.sha256Hex(arrayBuffer),
                arrayBuffer,
                extractedText
            };
        }

        return {
            parseResumeFile,
            extractTextFromPdf,
            extractTextFromDocx,
            _setPdfJsLoader
        };
    }
);
