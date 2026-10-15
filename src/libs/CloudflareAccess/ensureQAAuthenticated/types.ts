/**
 * `reauth-required` means the sign-in was cancelled or failed. On web that only happens when Back restores the
 * page: otherwise the page leaves for Cloudflare, the promise stays pending, and the callback arrives as a fresh load.
 */
type QAAuthGateResult = 'ready' | 'reauth-required';

type EnsureQAAuthenticated = (command?: string) => Promise<QAAuthGateResult>;

type HandleQAReauthRequired = (command?: string) => void;

export type {EnsureQAAuthenticated, HandleQAReauthRequired, QAAuthGateResult};
