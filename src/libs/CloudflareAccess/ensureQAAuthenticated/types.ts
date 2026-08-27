/** The returned promise never settles when it redirects, because the page is leaving */
type EnsureQAAuthenticated = (command?: string) => Promise<void>;

type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired};
