if (typeof window.linkedInCompanyFollowInjected === 'undefined') {
    window.linkedInCompanyFollowInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const followLog = [];

    function findCompanyCards() {
        return document.querySelectorAll(
            '.entity-result, ' +
            '[data-chameleon-result-urn], ' +
            '.reusable-search__result-container'
        );
    }

    function extractCompanyInfo(card) {
        const nameEl = card.querySelector(
            '.entity-result__title-text a span, ' +
            '.entity-result__title-text a, ' +
            '.app-aware-link span[dir]'
        );
        const name = nameEl
            ? nameEl.innerText.trim().split('\n')[0]
            : 'Unknown';
        const subtitleEl = card.querySelector(
            '.entity-result__primary-subtitle'
        );
        const subtitle = subtitleEl
            ? subtitleEl.innerText.trim() : '';
        const linkEl = card.querySelector(
            'a[href*="/company/"]'
        );
        const companyUrl = linkEl
            ? linkEl.href.split('?')[0] : '';
        return { name, subtitle, companyUrl };
    }

    function findFollowBtnInCard(card) {
        const btns = card.querySelectorAll('button');
        for (const btn of btns) {
            if (isCompanyFollowText(btn.innerText) &&
                !btn.disabled) {
                return btn;
            }
        }
        return null;
    }

    function findNextPageButton() {
        const nextBtns = document.querySelectorAll(
            'button[aria-label="Next"], ' +
            'button[aria-label="Avançar"]'
        );
        for (const btn of nextBtns) {
            if (!btn.disabled) return btn;
        }
        return null;
    }

    function reportProgress(followed, limit, page) {
        window.postMessage({
            type: 'LINKEDIN_BOT_PROGRESS',
            sent: followed, limit, page, skipped: 0
        }, '*');
    }

    async function runCompanyFollow(config) {
        console.log(
            '[LinkedIn Bot] Company follow started',
            config
        );
        const limit = config?.limit || 50;
        const companies = config?.targetCompanies || [];
        let totalFollowed = 0;
        let currentPage = 1;
        stopRequested = false;
        followLog.length = 0;

        try {
            while (totalFollowed < limit) {
                if (stopRequested) break;

                await delay(2000);
                const cards = findCompanyCards();
                console.log(
                    `[LinkedIn Bot] Page ${currentPage}: ` +
                    `${cards.length} company cards found`
                );

                for (const card of cards) {
                    if (totalFollowed >= limit ||
                        stopRequested) break;

                    const info = extractCompanyInfo(card);

                    if (companies.length > 0 &&
                        !companies.some(c =>
                            info.name.toLowerCase()
                                .includes(c.toLowerCase())
                        )) {
                        continue;
                    }

                    const followBtn =
                        findFollowBtnInCard(card);
                    if (!followBtn) {
                        followLog.push({
                            ...info,
                            status: 'skipped-already-following',
                            time: new Date().toISOString()
                        });
                        continue;
                    }

                    followBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    await delay(
                        800 + Math.random() * 1200
                    );
                    followBtn.click();
                    await delay(1000);

                    const btnText =
                        (followBtn.innerText || '').trim();
                    const success = btnText === 'Following' ||
                        btnText === 'Seguindo' ||
                        followBtn.disabled;

                    if (success) {
                        totalFollowed++;
                        followLog.push({
                            ...info,
                            status: 'followed',
                            time: new Date().toISOString()
                        });
                    } else {
                        followLog.push({
                            ...info,
                            status: 'skipped-failed',
                            time: new Date().toISOString()
                        });
                    }

                    reportProgress(
                        totalFollowed, limit, currentPage
                    );
                    await delay(
                        1500 + Math.random() * 2500
                    );
                }

                if (totalFollowed >= limit) break;

                const nextBtn = findNextPageButton();
                if (nextBtn) {
                    currentPage++;
                    nextBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    await delay(1000);
                    nextBtn.click();
                    await delay(6000);
                } else {
                    break;
                }
            }

            return {
                success: true,
                message: `Followed ${totalFollowed} ` +
                    `companies.`,
                log: followLog
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: followLog
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
        if (event.data?.type ===
            'LINKEDIN_COMPANY_FOLLOW_START') {
            runCompanyFollow(event.data.config)
                .then(result => {
                    window.postMessage({
                        type: 'LINKEDIN_BOT_DONE',
                        result
                    }, '*');
                });
        }
    });
}
