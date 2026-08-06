/**
 * Parks the in-flight authorize round trip across the full page unload of the same-tab OAuth redirect
 * (see Web_POC_ExpoWebBrowser.md). The popup transport kept this in module memory because the main tab
 * stayed alive; a top-level navigation destroys that, so the verifier, the state and where the user came
 * from have to survive in storage.
 *
 * sessionStorage, not localStorage: it is synchronous (readable in the pre-render window where the
 * callback must be handled), scoped to the one tab that started the flow — which makes the state check a
 * genuine per-tab provenance check — and cleared when the tab closes, so an abandoned flow can't leave a
 * live verifier behind. Web-only at runtime and guarded on `window`.
 */
import {isRecord} from '@libs/ObjectUtils';

import CONST from '@src/CONST';

/** Cloudflare's authorization codes are short-lived anyway; an older record is treated as absent */
const PENDING_FLOW_TTL_MS = 10 * 60 * 1000;

type PendingRedirectFlow = {
    /** CSRF/provenance value echoed back by Cloudflare on the callback */
    state: string;

    /** The PKCE secret, revealed only at the token exchange */
    codeVerifier: string;

    /** Absolute URL (route plus any open RHP) the user should land back on */
    returnURL: string;

    /** Epoch ms — see PENDING_FLOW_TTL_MS */
    createdAt: number;
};

/** Storage access itself throws in hardened browser configurations, not just the write */
function getSessionStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        return window.sessionStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * Throws when web storage is unavailable — the caller must refuse to redirect in that case rather than
 * navigate away and lose the verifier with no way to finish the exchange.
 */
function savePendingRedirectFlow(flow: PendingRedirectFlow): void {
    const storage = getSessionStorage();
    if (!storage) {
        throw new Error('Session storage is unavailable — cannot start the QA auth redirect');
    }
    storage.setItem(CONST.SESSION_STORAGE_KEYS.QA_AUTH_REDIRECT_FLOW, JSON.stringify(flow));
}

/**
 * Single-use: removes the record before returning it, so a replayed callback URL finds nothing.
 * Returns null when absent, unreadable, malformed or expired.
 */
function consumePendingRedirectFlow(): PendingRedirectFlow | null {
    const storage = getSessionStorage();
    if (!storage) {
        return null;
    }
    const raw = storage.getItem(CONST.SESSION_STORAGE_KEYS.QA_AUTH_REDIRECT_FLOW);
    storage.removeItem(CONST.SESSION_STORAGE_KEYS.QA_AUTH_REDIRECT_FLOW);
    if (!raw) {
        return null;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (
        !isRecord(parsed) ||
        typeof parsed.state !== 'string' ||
        parsed.state === '' ||
        typeof parsed.codeVerifier !== 'string' ||
        parsed.codeVerifier === '' ||
        typeof parsed.returnURL !== 'string' ||
        typeof parsed.createdAt !== 'number'
    ) {
        return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_FLOW_TTL_MS) {
        return null;
    }

    return {state: parsed.state, codeVerifier: parsed.codeVerifier, returnURL: parsed.returnURL, createdAt: parsed.createdAt};
}

function clearPendingRedirectFlow(): void {
    getSessionStorage()?.removeItem(CONST.SESSION_STORAGE_KEYS.QA_AUTH_REDIRECT_FLOW);
}

export {clearPendingRedirectFlow, consumePendingRedirectFlow, savePendingRedirectFlow};
export type {PendingRedirectFlow};
