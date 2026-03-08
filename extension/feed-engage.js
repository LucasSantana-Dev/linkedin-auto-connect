if (typeof window.linkedInFeedEngageInjected === 'undefined') {
    window.linkedInFeedEngageInjected = true;

    const delay = ms => new Promise(r => setTimeout(r, ms));
    let stopRequested = false;
    const engageLog = [];

    const REACTION_MAP = {
        'LIKE': 'Like',
        'PRAISE': 'Celebrate',
        'EMPATHY': 'Support',
        'INTEREST': 'Insightful',
        'ENTERTAINMENT': 'Funny',
        'APPRECIATION': 'Love'
    };

    const REACTION_MAP_PT = {
        'LIKE': 'Gostei',
        'PRAISE': 'Parabéns',
        'EMPATHY': 'Apoio',
        'INTEREST': 'Genial',
        'ENTERTAINMENT': 'Engraçado',
        'APPRECIATION': 'Amei'
    };

    function findPosts() {
        return document.querySelectorAll(
            '.feed-shared-update-v2, ' +
            '[data-urn*="activity"], ' +
            '.occludable-update'
        );
    }

    function getPostText(postEl) {
        const textEl = postEl.querySelector(
            '.feed-shared-text, ' +
            '.feed-shared-update-v2__description, ' +
            '.update-components-text, ' +
            'span[dir="ltr"]'
        );
        return textEl
            ? textEl.innerText.trim() : '';
    }

    function getPostAuthor(postEl) {
        const authorEl = postEl.querySelector(
            '.update-components-actor__name span, ' +
            '.feed-shared-actor__name span, ' +
            'a.update-components-actor__meta-link span'
        );
        return authorEl
            ? authorEl.innerText.trim().split('\n')[0]
            : 'Unknown';
    }

    function getPostUrn(postEl) {
        const urn = postEl.getAttribute('data-urn') ||
            postEl.querySelector('[data-urn]')
                ?.getAttribute('data-urn') || '';
        return urn;
    }

    async function reactToPost(postEl, reactionType) {
        const likeBtn = postEl.querySelector(
            'button.react-button, ' +
            'button[aria-label*="Like"], ' +
            'button[aria-label*="Gostei"], ' +
            'button.reactions-react-button'
        );
        if (!likeBtn) return false;

        if (reactionType === 'LIKE') {
            const alreadyLiked =
                likeBtn.getAttribute('aria-pressed') ===
                'true';
            if (alreadyLiked) return false;
            likeBtn.click();
            await delay(500);
            return true;
        }

        likeBtn.dispatchEvent(new MouseEvent(
            'mouseenter', { bubbles: true }
        ));
        await delay(800);

        const popup = document.querySelector(
            '.reactions-menu, ' +
            '[class*="reactions-menu"], ' +
            '.react-button__popup'
        );

        if (popup) {
            const btns = popup.querySelectorAll(
                'button, [role="menuitem"]'
            );
            for (const btn of btns) {
                const label = (
                    btn.getAttribute('aria-label') ||
                    btn.innerText || ''
                ).trim();
                if (label.includes(
                    REACTION_MAP[reactionType]) ||
                    label.includes(
                        REACTION_MAP_PT[reactionType]
                    )) {
                    btn.click();
                    await delay(500);
                    return true;
                }
            }
        }

        likeBtn.click();
        await delay(500);
        return true;
    }

    function setEditorText(editor, text) {
        editor.focus();
        editor.textContent = '';
        const p = document.createElement('p');
        p.textContent = text;
        editor.appendChild(p);
        editor.dispatchEvent(
            new Event('input', { bubbles: true })
        );
    }

    async function commentOnPost(postEl, commentText) {
        const commentBtn = postEl.querySelector(
            'button[aria-label*="Comment"], ' +
            'button[aria-label*="Comentar"], ' +
            'button.comment-button'
        );
        if (!commentBtn) return false;

        commentBtn.click();
        await delay(1500);

        const editor = postEl.querySelector(
            '.ql-editor[contenteditable="true"], ' +
            '[role="textbox"][contenteditable="true"], ' +
            '.comments-comment-box__form ' +
            '[contenteditable="true"]'
        );
        if (editor) {
            setEditorText(editor, commentText);
        } else {
            const globalEditor = document.querySelector(
                '.ql-editor[contenteditable="true"], ' +
                '[role="textbox"]' +
                '[contenteditable="true"]'
            );
            if (!globalEditor) return false;
            setEditorText(globalEditor, commentText);
        }

        await delay(1000);

        const submitBtn = document.querySelector(
            'button.comments-comment-box__submit-button, ' +
            'button[class*="comment"]' +
            '[type="submit"], ' +
            'form.comments-comment-box__form ' +
            'button[type="submit"]'
        );
        if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            await delay(1500);
            return true;
        }
        return false;
    }

    async function runFeedEngage(config) {
        console.log(
            '[LinkedIn Bot] Feed engagement started',
            config
        );
        const limit = config?.limit || 20;
        const doReact = config?.react !== false;
        const doComment = config?.comment === true;
        const commentTemplates =
            config?.commentTemplates || [];
        const skipKeywords =
            config?.skipKeywords || [];
        const reactionKeywords = config?.reactionKeywords || {
            celebrate: ['congrat', 'parabén', 'promoted',
                'new role', 'achievement', 'milestone'],
            support: ['struggle', 'difficult', 'layoff',
                'mental health', 'challenge', 'tough'],
            insightful: ['research', 'data', 'study',
                'insight', 'analysis', 'trend', 'report'],
            funny: ['joke', 'humor', 'meme', 'funny',
                'lol', 'haha'],
            love: ['passion', 'love', 'inspire',
                'grateful', 'thankful', 'amazing']
        };
        let totalEngaged = 0;
        let scrollCount = 0;
        const MAX_SCROLLS = 20;
        const processedUrns = new Set();
        stopRequested = false;
        engageLog.length = 0;

        try {
            while (totalEngaged < limit &&
                scrollCount < MAX_SCROLLS) {
                if (stopRequested) break;

                await delay(2000);
                const posts = findPosts();
                console.log(
                    `[LinkedIn Bot] Found ${posts.length}` +
                    ` posts (scroll ${scrollCount + 1})`
                );

                for (const post of posts) {
                    if (totalEngaged >= limit ||
                        stopRequested) break;

                    const urn = getPostUrn(post);
                    if (urn && processedUrns.has(urn)) {
                        continue;
                    }
                    if (urn) processedUrns.add(urn);

                    const postText = getPostText(post);
                    const author = getPostAuthor(post);

                    if (!isReactablePost(post)) continue;
                    if (shouldSkipPost(
                        postText, skipKeywords)) {
                        engageLog.push({
                            author, postText:
                                postText.substring(0, 100),
                            status: 'skipped-keyword',
                            time: new Date().toISOString()
                        });
                        continue;
                    }

                    post.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    await delay(
                        1000 + Math.random() * 1500
                    );

                    let actions = [];

                    if (doReact) {
                        const reactionType =
                            getReactionType(
                                postText, reactionKeywords
                            );
                        const reacted = await reactToPost(
                            post, reactionType
                        );
                        if (reacted) {
                            actions.push(
                                REACTION_MAP[reactionType]
                                    .toLowerCase()
                            );
                        }
                    }

                    if (doComment &&
                        commentTemplates.length > 0) {
                        const comment =
                            buildCommentFromPost(
                                postText, commentTemplates
                            );
                        if (comment) {
                            await delay(
                                2000 + Math.random() * 2000
                            );
                            const commented =
                                await commentOnPost(
                                    post, comment
                                );
                            if (commented) {
                                actions.push('commented');
                            }
                        }
                    }

                    if (actions.length > 0) {
                        totalEngaged++;
                        engageLog.push({
                            author,
                            postText:
                                postText.substring(0, 100),
                            status: actions.join('+'),
                            time: new Date().toISOString()
                        });
                        window.postMessage({
                            type: 'LINKEDIN_BOT_PROGRESS',
                            sent: totalEngaged,
                            limit,
                            page: scrollCount + 1,
                            skipped: 0
                        }, '*');
                    }

                    await delay(
                        2000 + Math.random() * 3000
                    );
                }

                if (totalEngaged >= limit) break;

                window.scrollBy({
                    top: window.innerHeight * 0.8,
                    behavior: 'smooth'
                });
                scrollCount++;
                await delay(3000 + Math.random() * 2000);
            }

            return {
                success: true,
                message: `Feed engagement done! ` +
                    `Interacted with ${totalEngaged} posts.`,
                log: engageLog
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: engageLog
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type === 'LINKEDIN_BOT_STOP') {
            stopRequested = true;
        }
        if (event.data?.type ===
            'LINKEDIN_FEED_ENGAGE_START') {
            runFeedEngage(event.data.config)
                .then(result => {
                    window.postMessage({
                        type: 'LINKEDIN_BOT_DONE',
                        result
                    }, '*');
                });
        }
    });
}
