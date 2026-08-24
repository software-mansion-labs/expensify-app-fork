/**
 * Runs before a QA request is sent. Resolves once the session signals have settled, and — for a command
 * allowed to cause one — after deciding whether to navigate this tab to Cloudflare. The returned promise
 * never settles when it does redirect, because the page is leaving.
 */
type EnsureQAAuthenticated = (command?: string) => Promise<void>;

/**
 * Called when a QA request gave up on the session entirely. Starts a fresh authorize round trip, but only
 * for a command the app cannot proceed without.
 */
type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired};
