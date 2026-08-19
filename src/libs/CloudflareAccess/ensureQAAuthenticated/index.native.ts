/**
 * Native never talks to the Cloudflare Access-protected QA origin, and the OAuth redirect this module drives
 * is a browser navigation with no native equivalent. Stubbing it here — rather than letting the web version's
 * `isQAAuthConfigured()` short-circuit at runtime — keeps the whole authorize/PKCE/token chain out of the
 * native bundle, matching the `Config` and `handleAuthRedirectCallback` variants next door.
 */
function ensureQAAuthenticated(): Promise<void> {
    return Promise.resolve();
}

function handleQAReauthRequired(): void {}

export {ensureQAAuthenticated, handleQAReauthRequired};
