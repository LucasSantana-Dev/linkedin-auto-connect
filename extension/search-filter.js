(function () {
    if (window.__linkedInSearchFilterActive) return;
    window.__linkedInSearchFilterActive = true;

    function dimConnectedCards() {
        const cards = document.querySelectorAll(
            '.entity-result, ' +
            '.reusable-search__result-container'
        );
        for (const card of cards) {
            if (card.dataset.leFiltered) continue;
            const btns = card.querySelectorAll('button, a');
            let hasConnect = false;
            let hasMessage = false;
            for (const b of btns) {
                const t = (b.innerText || '')
                    .trim().toLowerCase();
                if (t === 'connect' || t === 'conectar') {
                    hasConnect = true;
                }
                if (t === 'message' || t === 'mensagem') {
                    hasMessage = true;
                }
            }
            if (hasMessage && !hasConnect) {
                card.style.opacity = '0.2';
                card.style.pointerEvents = 'none';
                card.style.transition = 'opacity 0.3s ease';
                card.dataset.leFiltered = '1';
            }
        }
    }

    function stripFirstDegree() {
        const url = new URL(window.location.href);
        const raw = url.searchParams.get('network');
        if (!raw) return;
        try {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr) ||
                !arr.includes('F')) return;
            const filtered = arr.filter(v => v !== 'F');
            if (filtered.length === 0) {
                filtered.push('S', 'O');
            }
            url.searchParams.set(
                'network',
                JSON.stringify(filtered)
            );
            window.location.replace(url.toString());
        } catch (e) {}
    }

    stripFirstDegree();
    dimConnectedCards();

    const observer = new MutationObserver(dimConnectedCards);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
