chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'runAutomation') {
        window.postMessage({
            type: 'LINKEDIN_BOT_START',
            config: request
        }, '*');
        sendResponse({ status: 'started' });
        return true;
    }
    if (request.action === 'stop') {
        window.postMessage({
            type: 'LINKEDIN_BOT_STOP'
        }, '*');
        sendResponse({ status: 'stopping' });
        return true;
    }
});

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'LINKEDIN_BOT_DONE') {
        chrome.runtime.sendMessage({
            action: 'done',
            result: event.data.result
        });
    }
    if (event.data?.type === 'LINKEDIN_BOT_PROGRESS') {
        chrome.runtime.sendMessage({
            action: 'progress',
            sent: event.data.sent,
            limit: event.data.limit,
            page: event.data.page,
            skipped: event.data.skipped,
            error: event.data.error || null
        });
    }
});
