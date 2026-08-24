/**
 * Native never talks to the Cloudflare Access-protected QA origin, and the OAuth redirect this module drives
 * is a browser navigation with no native equivalent. Stubbing it here — rather than letting the web version's
 * `isQAAuthConfigured()` short-circuit at runtime — keeps the whole authorize/PKCE/token chain out of the
 * native bundle, matching the `Config` and `finishSignInFromURL` variants next door.
 */
import type {EnsureQAAuthenticated, HandleQAReauthRequired} from './types';

const ensureQAAuthenticated: EnsureQAAuthenticated = () => Promise.resolve();

const handleQAReauthRequired: HandleQAReauthRequired = () => {};

export {ensureQAAuthenticated, handleQAReauthRequired};
