/** The returned promise stays pending while the page leaves for Cloudflare, and resolves if Back restores it */
type EnsureQAAuthenticated = (command?: string) => Promise<void>;

type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired};
