/**
 * Runs before a QA request is sent. The returned promise never settles when it does redirect, because the
 * page is leaving.
 */
type EnsureQAAuthenticated = (command?: string) => Promise<void>;

/** Called when a QA request gave up on the session entirely */
type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired};
