(function () {
    if (window.__leSearchFilter) return;
    window.__leSearchFilter = true;

    console.log('[LE] search-filter.js loaded');

    function dimCards() {
        const cards = document.querySelectorAll(
            '.entity-result, ' +
            '.reusable-search__result-container, ' +
            'li'
        );
        let dimmed = 0;
        for (const card of cards) {
            if (card.dataset.leDone) continue;
            const btns = card.querySelectorAll('button, a');
            let hasConnect = false;
            let hasMessage = false;
            for (const b of btns) {
                const t = (b.textContent || '')
                    .trim().toLowerCase();
                if (t.includes('connect') ||
                    t.includes('conectar')) {
                    hasConnect = true;
                }
                if (t.includes('message') ||
                    t.includes('mensagem')) {
                    hasMessage = true;
                }
            }
            if (hasMessage && !hasConnect) {
                card.style.setProperty(
                    'opacity', '0.15', 'important'
                );
                card.style.setProperty(
                    'pointer-events', 'none', 'important'
                );
                card.dataset.leDone = 'dim';
                dimmed++;
            } else if (hasConnect) {
                card.dataset.leDone = 'ok';
            }
        }
        if (dimmed > 0) {
            console.log(`[LE] dimmed ${dimmed} cards`);
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
    dimCards();

    const obs = new MutationObserver(dimCards);
    if (document.body) {
        obs.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setInterval(dimCards, 1500);
})();
