/**
 * Recovery channel for OAuth popups whose `window.opener` link was severed (POC finding, Jul 27 —
 * see Web_POC.md §5.4). Something in Cloudflare's redirect chain disowns the popup; which hop and by
 * which mechanism was never identified, and this recovery deliberately does not depend on knowing.
 * Expo's `maybeCompleteAuthSession` then posts its completion message to `window.opener ?? window.parent`,
 * which for a severed top-level popup is the popup itself: the opener never hears back, its popup
 * handle still looks open, and `openAuthSessionAsync` hangs forever with no error anywhere.
 *
 * The recovery relies on two facts:
 *   1. `maybeCompleteAuthSession` writes the callback URL to `localStorage` under
 *      `ExpoWebBrowser_OriginUrl_<state>` BEFORE it attempts the opener postMessage (read from
 *      expo-web-browser's web implementation).
 *   2. Same-origin `storage` events still propagate across windows whose opener link is severed,
 *      since localStorage is shared per origin regardless of how the windows relate.
 *
 * Everything here is web-only at runtime and guards on `window`; on native (and in node-env tests)
 * the watcher never settles and the popup helper is a no-op.
 */
import {getOAuthRedirectURI, isQAAuthConfigured} from './config';

/** Fixed localStorage keys from expo-web-browser's web implementation (ExpoWebBrowser.web.js) */
const EXPO_SESSION_HANDLE_KEY = 'ExpoWebBrowserRedirectHandle';
const EXPO_ORIGIN_URL_KEY_PREFIX = 'ExpoWebBrowser_OriginUrl_';

/** Belt-and-braces alongside the storage event, which can't fire for writes that precede the listener */
const COMPLETION_POLL_INTERVAL_MS = 1000;

type AuthSessionCompletion = {type: 'success'; url: string};

type SeveredOpenerWatcher = {
    /** Settles with the recovered callback URL; never settles on the happy path (or off-web) */
    completion: Promise<AuthSessionCompletion>;

    /** Removes the storage listener and poll — call once the race is decided either way */
    stop: () => void;
};

function hasWebStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Watches for the popup's completion breadcrumb landing in localStorage. Raced against
 * `openAuthSessionAsync` by the auth flow; whichever channel delivers first wins.
 */
function watchForSeveredOpenerCompletion(state: string): SeveredOpenerWatcher {
    if (!hasWebStorage()) {
        return {completion: new Promise<never>(() => {}), stop: () => {}};
    }

    const originURLKey = `${EXPO_ORIGIN_URL_KEY_PREFIX}${state}`;
    let storageListener: ((event: StorageEvent) => void) | undefined;
    let pollInterval: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
        if (storageListener) {
            window.removeEventListener('storage', storageListener);
            storageListener = undefined;
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = undefined;
        }
    };

    const completion = new Promise<AuthSessionCompletion>((resolve) => {
        const settle = (url: string) => {
            stop();
            resolve({type: 'success', url});
        };
        storageListener = (event) => {
            if (event.key !== originURLKey || !event.newValue) {
                return;
            }
            settle(event.newValue);
        };
        window.addEventListener('storage', storageListener);
        pollInterval = setInterval(() => {
            const url = window.localStorage.getItem(originURLKey);
            if (!url) {
                return;
            }
            settle(url);
        }, COMPLETION_POLL_INTERVAL_MS);
    });

    return {completion, stop};
}

/**
 * Popup-side counterpart, called at App boot right after `maybeCompleteAuthSession()`: when this
 * window is an auth popup that already published its completion but lost its opener, nobody is left
 * to close it — the opener's `dismissAuthSession()` close is a no-op on a severed handle. Self-close
 * instead (permitted for script-opened windows) so the tester isn't left with a zombie app window.
 * No-op everywhere else, including the main window reloading while an auth session is pending:
 * the path check can only match inside a popup, since no app route lives at the redirect path.
 */
function closeQAAuthPopupIfSeveredOpener(): void {
    if (!hasWebStorage() || !isQAAuthConfigured()) {
        return;
    }
    // A live opener means the healthy channel worked — it will close this popup itself
    if (window.opener != null) {
        return;
    }
    if (window.location.pathname !== new URL(getOAuthRedirectURI()).pathname) {
        return;
    }
    const handle = window.localStorage.getItem(EXPO_SESSION_HANDLE_KEY);
    // Only after maybeCompleteAuthSession published the completion — never close a window mid-flow
    if (!handle || !window.localStorage.getItem(`${EXPO_ORIGIN_URL_KEY_PREFIX}${handle}`)) {
        return;
    }
    window.close();
}

export {closeQAAuthPopupIfSeveredOpener, watchForSeveredOpenerCompletion};
export type {AuthSessionCompletion, SeveredOpenerWatcher};
